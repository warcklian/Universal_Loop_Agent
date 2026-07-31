import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import { CANONICAL_MEMORY_FILE, ensureCanonicalMemory } from "./memory.ts"
import { detectProject } from "./detector.ts"

export interface PlanFromResult {
  ideaFile: string
  memoryFile: string
  phases: string[]
  message: string
}

function extractPhases(text: string): string[] {
  const lines = text.split(/\r?\n/)
  const phases: string[] = []

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/)
    if (h2?.[1]) {
      const title = h2[1].trim()
      if (!/^(open items|recent status|phases|how to|pendientes|estado)/i.test(title)) {
        phases.push(title)
      }
      continue
    }
    const numbered = line.match(/^\s*(?:\d+[\).]|[-*]\s+\[[ xX]\]|[-*])\s+(.+)$/)
    if (numbered?.[1] && numbered[1].trim().length > 3) {
      phases.push(numbered[1].trim())
    }
  }

  const unique = [...new Set(phases.map((p) => p.replace(/\s+/g, " ").trim()))]
  if (unique.length >= 2) return unique.slice(0, 20)

  // Fallback: coarse chunks from paragraphs
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 40)
  if (paras.length) {
    return paras.slice(0, 8).map((p, i) => `Phase ${i + 1} — ${p.slice(0, 80)}${p.length > 80 ? "…" : ""}`)
  }
  return [`Phase 1 — Implement the idea from the provided file`]
}

function upsertPhasesSection(memory: string, phases: string[], ideaName: string): string {
  const checklist = phases.map((p) => `- [ ] ${p}`).join("\n")
  const block = [
    "## Phases",
    "",
    `_Derived from \`${ideaName}\` by uagent plan-from. Mark done only after implement + tests._`,
    "",
    checklist,
    "",
  ].join("\n")

  if (/^## Phases\b/m.test(memory)) {
    return memory.replace(/^## Phases\b[\s\S]*?(?=^## |\z)/m, `${block}\n`)
  }

  if (/^---$/m.test(memory)) {
    return memory.replace(/^---$/m, `---\n\n${block}`)
  }
  return `${memory.trim()}\n\n${block}\n`
}

/**
 * Turn an idea/plan file into an ordered phase checklist in PROJECT_MEMORY.md.
 * Supports autonomous loop without coupling to the toolkit folder.
 */
export function planFromIdea(targetDir: string, ideaRelOrAbs: string): PlanFromResult {
  const root = resolve(targetDir)
  const ideaPath = resolve(root, ideaRelOrAbs)
  if (!existsSync(ideaPath)) {
    throw new Error(`Idea/plan file not found: ${ideaPath}`)
  }

  const project = detectProject(root)
  ensureCanonicalMemory(root, project)

  const ideaText = readFileSync(ideaPath, "utf-8")
  const phases = extractPhases(ideaText)
  const memoryPath = join(root, CANONICAL_MEMORY_FILE)
  const prev = readFileSync(memoryPath, "utf-8")
  const next = upsertPhasesSection(prev, phases, basename(ideaPath))
  writeFileSync(memoryPath, next, "utf-8")

  return {
    ideaFile: ideaPath,
    memoryFile: memoryPath,
    phases,
    message: `Wrote ${phases.length} phase(s) into ${CANONICAL_MEMORY_FILE}`,
  }
}
