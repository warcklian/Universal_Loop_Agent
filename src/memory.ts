import { writeFileSync, mkdirSync, existsSync, readFileSync, renameSync } from "node:fs"
import { join } from "node:path"
import type { DetectedProject } from "./detector.ts"
import { ensureChangeControlRegister } from "./change-control.ts"

/** Canonical portable handoff at project root (survives folder/machine moves). */
export const CANONICAL_MEMORY_FILE = "PROJECT_MEMORY.md"

/** Legacy Spanish name — migrated to CANONICAL_MEMORY_FILE on init/upgrade. */
export const LEGACY_CANONICAL_MEMORY_FILE = "MEMORIA_PROYECTO.md"

export interface MemoryFile {
  path: string
  content: string
}

function createMemoriaProyectoSeed(project: DetectedProject): string {
  const stackBits: string[] = []
  if (project.languages.length) stackBits.push(`Languages: ${project.languages.join(", ")}`)
  if (project.frameworks.length) stackBits.push(`Frameworks: ${project.frameworks.join(", ")}`)
  if (project.runtime.length) stackBits.push(`Runtime: ${project.runtime.join(", ")}`)
  if (project.databases.length) stackBits.push(`Databases: ${project.databases.join(", ")}`)

  return [
    "# Project memory (canonical)",
    "",
    "**Single source of truth** for handoff across sessions, teams, and AI agents.",
    "Travels with the repository (any folder or drive). Does not replace the master plan or ops docs.",
    "",
    `| Related | Role |`,
    `|-------------|-----|`,
    `| \`AGENTS.md\` | Agent / loop rules; must read and update **this** file |`,
    `| \`CONTROL_CAMBIOS.md\` | Local change control register (row before code, docs before implementing) |`,
    `| \`.uagent/memory/\` | Stubs that point here (multi-agent / uagent) |`,
    "",
    `**Project:** ${project.name}`,
    "",
    stackBits.length ? `**Stack detected:** ${stackBits.join(" · ")}` : "",
    "",
    `**Last updated:** ${new Date().toISOString().slice(0, 10)} (init uagent)`,
    "",
    "---",
    "",
    "## Open items",
    "",
    "_List what is open for the next session._",
    "",
    "## Recent status",
    "",
    "_After each substantive delivery: 1 paragraph + key files touched._",
    "",
    "### How to update",
    "",
    "Date, open items if they change, brief summary. Do not duplicate runbooks or the change register.",
    "",
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n")
}

function stubContext(): string {
  return [
    "# Project Context (stub)",
    "",
    "The canonical project memory lives at the **repository root**:",
    "",
    `**[\`${CANONICAL_MEMORY_FILE}\`](../../${CANONICAL_MEMORY_FILE})**`,
    "",
    "Do not write the handoff here. Always update that file.",
    "This `.uagent/memory/` folder exists for the multi-agent loop (uagent); its files are pointers only.",
    "",
  ].join("\n")
}

function stubDecisions(): string {
  return [
    "# Decisions Log (stub)",
    "",
    `Product/architecture decisions: the project master plan and, if applicable, notes in`,
    `**[\`${CANONICAL_MEMORY_FILE}\`](../../${CANONICAL_MEMORY_FILE})**.`,
    "",
    "Do not keep a second diary here.",
    "",
  ].join("\n")
}

function stubSessionLog(): string {
  return [
    "# Session Log (stub)",
    "",
    `Session handoff: **[\`${CANONICAL_MEMORY_FILE}\`](../../${CANONICAL_MEMORY_FILE})** (repo root).`,
    "",
    "Optional: add a line here **in addition to** updating the canonical memory, never instead of it.",
    "",
  ].join("\n")
}

function stubAgent(agentName: string): string {
  return [
    `# Agent: ${agentName} (stub)`,
    "",
    `Memoria compartida del proyecto: **[\`${CANONICAL_MEMORY_FILE}\`](../../../${CANONICAL_MEMORY_FILE})**.`,
    "",
  ].join("\n")
}

function createIndexFile(project: DetectedProject): string {
  return JSON.stringify(
    {
      version: "1.1.0",
      project: project.name,
      canonicalMemory: CANONICAL_MEMORY_FILE,
      note: "Canonical handoff lives at repo root. Files under .uagent/memory/ are stubs only.",
      created: new Date().toISOString(),
      lastSession: null,
      sessions: [],
      agents: {},
    },
    null,
    2,
  )
}

export function getMemoryFiles(project: DetectedProject): MemoryFile[] {
  return [
    { path: "context.md", content: stubContext() },
    { path: "decisions.md", content: stubDecisions() },
    { path: "index.json", content: createIndexFile(project) },
    { path: "session-log.md", content: stubSessionLog() },
    { path: "agents/core.md", content: stubAgent("core") },
  ]
}

/** Create root PROJECT_MEMORY.md only if missing (never overwrite). */
export function ensureCanonicalMemory(targetDir: string, project: DetectedProject): void {
  const root = join(targetDir)
  const memoriaPath = join(root, CANONICAL_MEMORY_FILE)
  const legacyPath = join(root, LEGACY_CANONICAL_MEMORY_FILE)

  if (existsSync(memoriaPath)) {
    console.log(`  ${CANONICAL_MEMORY_FILE} already exists — left unchanged`)
  } else if (existsSync(legacyPath)) {
    // Migrate the legacy filename in place so the canonical name is the only one on disk
    renameSync(legacyPath, memoriaPath)
    console.log(`  Renamed ${LEGACY_CANONICAL_MEMORY_FILE} → ${CANONICAL_MEMORY_FILE} (legacy migration)`)
  } else {
    writeFileSync(memoriaPath, createMemoriaProyectoSeed(project), "utf-8")
    console.log(`  Created ${CANONICAL_MEMORY_FILE} (canonical portable memory)`)
  }

  ensureChangeControlRegister(root, CANONICAL_MEMORY_FILE)
}

export function initMemory(targetDir: string, project: DetectedProject): void {
  ensureCanonicalMemory(targetDir, project)

  const memoryDir = join(targetDir, ".uagent", "memory")
  if (!existsSync(memoryDir)) {
    mkdirSync(memoryDir, { recursive: true })
  }

  const agentsDir = join(memoryDir, "agents")
  if (!existsSync(agentsDir)) {
    mkdirSync(agentsDir, { recursive: true })
  }

  const files = getMemoryFiles(project)
  for (const file of files) {
    const filePath = join(memoryDir, file.path)
    const parts = file.path.split("/")
    if (parts.length > 1) {
      const dir = join(memoryDir, ...parts.slice(0, -1))
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    }
    writeFileSync(filePath, file.content, "utf-8")
  }

  console.log(`  Created .uagent/memory/ stubs → ${CANONICAL_MEMORY_FILE} (${files.length} files)`)
}

export function ensureMemory(targetDir: string, project: DetectedProject): void {
  ensureCanonicalMemory(targetDir, project)

  const memoryDir = join(targetDir, ".uagent", "memory")
  const indexPath = join(memoryDir, "index.json")
  if (!existsSync(memoryDir) || !existsSync(indexPath)) {
    initMemory(targetDir, project)
    return
  }

  try {
    const raw = readFileSync(indexPath, "utf-8")
    const idx = JSON.parse(raw) as { canonicalMemory?: string }
    if (idx.canonicalMemory !== CANONICAL_MEMORY_FILE) {
      writeFileSync(indexPath, createIndexFile(project), "utf-8")
      writeFileSync(join(memoryDir, "context.md"), stubContext(), "utf-8")
      console.log(`  Updated .uagent/memory stubs to point at ${CANONICAL_MEMORY_FILE}`)
    }
  } catch {
    initMemory(targetDir, project)
  }
}
