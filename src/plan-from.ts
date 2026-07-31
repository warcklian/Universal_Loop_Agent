import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import { CANONICAL_MEMORY_FILE, ensureCanonicalMemory } from "./memory.ts"
import { detectProject } from "./detector.ts"

export interface PlanFromResult {
  ideaFile: string
  memoryFile: string
  phases: string[]
  skipped: boolean
  message: string
}

/** Section titles from templates/idea.md — not implementation phases. */
const TEMPLATE_SECTION_TITLES =
  /^(goal|must have|nice to have|constraints|notes|project idea|open items|recent status|phases|how to|pendientes|estado)$/i

function isPlaceholderItem(text: string): boolean {
  const t = text.trim()
  if (!t || t === "_" || /^_+$/.test(t)) return true
  if (/^[-*]\s*_+$/.test(t)) return true
  if (/^\d+[\).]\s*_+$/.test(t)) return true
  if (/^(stack|do not use|deadline).*: _$/i.test(t)) return true
  return false
}

/** True when idea.md is still the bundled empty template (or equivalent). */
export function isUnfilledIdeaTemplate(text: string): boolean {
  const t = text.trim()
  const looksLikeTemplate =
    (/#\s*Project idea/i.test(t) || /Describe what you want to build/i.test(t)) &&
    /##\s*Goal/i.test(t) &&
    /##\s*Must have/i.test(t)

  if (!looksLikeTemplate) return false

  const stripped = t
    .replace(/^#.+$/gm, "")
    .replace(/^##.+$/gm, "")
    .replace(/_[^_\n]*_/g, " ")
    .replace(/Describe what you want to build[^\n]*/gi, " ")
    .replace(/The agent will turn this[^\n]*/gi, " ")
    .replace(/^[-\d.*)\s_]+$/gm, " ")
    .replace(/^(?:[-*]\s+)?(?:\d+[\).]\s+)?(?:stack|do not use|deadline)[^:\n]*:\s*_$/gim, " ")
    .replace(/\s+/g, " ")
    .trim()

  return stripped.length < 20
}

export function extractPhases(text: string): string[] {
  if (isUnfilledIdeaTemplate(text)) return []

  const lines = text.split(/\r?\n/)
  const phases: string[] = []

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/)
    if (h2?.[1]) {
      const title = h2[1].trim()
      if (!TEMPLATE_SECTION_TITLES.test(title)) {
        phases.push(title)
      }
      continue
    }
    const numbered = line.match(/^\s*(?:\d+[\).]|[-*]\s+\[[ xX]\]|[-*])\s+(.+)$/)
    if (numbered?.[1] && numbered[1].trim().length > 3 && !isPlaceholderItem(numbered[1])) {
      phases.push(numbered[1].trim())
    }
  }

  const unique = [...new Set(phases.map((p) => p.replace(/\s+/g, " ").trim()))].filter(
    (p) => !TEMPLATE_SECTION_TITLES.test(p) && !isPlaceholderItem(p),
  )
  if (unique.length >= 2) return unique.slice(0, 20)
  if (unique.length === 1) return unique

  // Fallback paragraphs only for non-template freeform notes
  if (/##\s*Goal/i.test(text) && /##\s*Must have/i.test(text)) return []

  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 40)
    .filter((p) => !/Describe what you want to build/i.test(p))
    .filter((p) => !/^_[^_]+_$/.test(p))
  if (paras.length >= 2) {
    return paras.slice(0, 8).map((p, i) => `Phase ${i + 1} — ${p.slice(0, 80)}${p.length > 80 ? "…" : ""}`)
  }
  return []
}

/** Replace or insert the ## Phases section (JS has no \\z end-anchor). */
export function upsertPhasesSection(memory: string, phases: string[], ideaName: string): string {
  const checklist = phases.map((p) => `- [ ] ${p}`).join("\n")
  const block = [
    "## Phases",
    "",
    `_Derived from \`${ideaName}\` by uagent plan-from. Mark done only after implement + tests._`,
    "",
    checklist,
    "",
  ].join("\n")

  const startIdx = memory.search(/^## Phases\b/m)
  if (startIdx >= 0) {
    const afterHeading = memory.slice(startIdx + "## Phases".length)
    const nextRel = afterHeading.search(/\n## /)
    const endIdx = nextRel < 0 ? memory.length : startIdx + "## Phases".length + nextRel
    return `${memory.slice(0, startIdx)}${block}${nextRel < 0 ? "" : memory.slice(endIdx + 1)}`
  }

  if (/^---$/m.test(memory)) {
    return memory.replace(/^---$/m, `---\n\n${block}`)
  }
  return `${memory.trim()}\n\n${block}\n`
}

/**
 * Turn an idea/plan file into an ordered phase checklist in PROJECT_MEMORY.md.
 * Supports autonomous loop without coupling to the toolkit folder.
 * Skips unfilled templates so setup-all does not invent fake phases.
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
  const memoryPath = join(root, CANONICAL_MEMORY_FILE)

  if (isUnfilledIdeaTemplate(ideaText)) {
    return {
      ideaFile: ideaPath,
      memoryFile: memoryPath,
      phases: [],
      skipped: true,
      message:
        "idea.md still looks like the empty template — edit Goal/Must have with real work, then re-run setup-all",
    }
  }

  const phases = extractPhases(ideaText)
  if (phases.length === 0) {
    return {
      ideaFile: ideaPath,
      memoryFile: memoryPath,
      phases: [],
      skipped: true,
      message: "No concrete phases found in idea/plan — add ## Phase titles or a checklist, then re-run",
    }
  }

  const prev = readFileSync(memoryPath, "utf-8")
  const next = upsertPhasesSection(prev, phases, basename(ideaPath))
  writeFileSync(memoryPath, next, "utf-8")

  return {
    ideaFile: ideaPath,
    memoryFile: memoryPath,
    phases,
    skipped: false,
    message: `Wrote ${phases.length} phase(s) into ${CANONICAL_MEMORY_FILE}`,
  }
}
