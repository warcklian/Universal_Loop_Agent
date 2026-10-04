import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { DetectedProject } from "./detector.ts"

/** Canonical portable handoff at project root (survives folder/machine moves). */
export const CANONICAL_MEMORY_FILE = "MEMORIA_PROYECTO.md"

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
    "# Memoria del proyecto (canónica)",
    "",
    "**Fuente única** de handoff entre sesiones, equipos e IAs. Viaja con el repositorio",
    "(cualquier carpeta o unidad). No sustituye el plan maestro ni la documentación operativa.",
    "",
    `| Relacionado | Rol |`,
    `|-------------|-----|`,
    `| \`AGENTS.md\` | Reglas del agente / loop; debe leer y actualizar **este** archivo |`,
    `| \`.uagent/memory/\` | Stubs que apuntan aquí (multi-agente / uagent) |`,
    "",
    `**Proyecto:** ${project.name}`,
    "",
    stackBits.length ? `**Stack detectado:** ${stackBits.join(" · ")}` : "",
    "",
    `**Última actualización:** ${new Date().toISOString().slice(0, 10)} (init uagent)`,
    "",
    "---",
    "",
    "## Pendientes",
    "",
    "_Listar aquí lo abierto para la siguiente sesión._",
    "",
    "## Estado reciente",
    "",
    "_Tras cada entrega sustantiva: 1 párrafo + archivos clave tocados._",
    "",
    "### Cómo actualizar",
    "",
    "Fecha, pendientes si cambian, resumen breve. No duplicar runbooks ni el changelog del plan.",
    "",
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n")
}

function stubContext(): string {
  return [
    "# Project Context (stub)",
    "",
    "La memoria canónica del proyecto está en la **raíz del repositorio**:",
    "",
    `**[\`${CANONICAL_MEMORY_FILE}\`](../../${CANONICAL_MEMORY_FILE})**`,
    "",
    "No escriba el handoff aquí. Actualice siempre ese archivo.",
    "Esta carpeta `.uagent/memory/` existe para el loop multi-agente (uagent); los archivos son punteros.",
    "",
  ].join("\n")
}

function stubDecisions(): string {
  return [
    "# Decisions Log (stub)",
    "",
    `Decisiones de producto/arquitectura: plan maestro del proyecto y, si aplica, notas en`,
    `**[\`${CANONICAL_MEMORY_FILE}\`](../../${CANONICAL_MEMORY_FILE})**.`,
    "",
    "No mantenga un segundo diario aquí.",
    "",
  ].join("\n")
}

function stubSessionLog(): string {
  return [
    "# Session Log (stub)",
    "",
    `Handoff entre sesiones: **[\`${CANONICAL_MEMORY_FILE}\`](../../${CANONICAL_MEMORY_FILE})** (raíz del repo).`,
    "",
    "Opcional: anotar un renglón aquí **además** de actualizar la memoria canónica, nunca en su lugar.",
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

/** Create root MEMORIA_PROYECTO.md only if missing (never overwrite). */
export function ensureCanonicalMemory(targetDir: string, project: DetectedProject): void {
  const memoriaPath = join(targetDir, CANONICAL_MEMORY_FILE)
  if (existsSync(memoriaPath)) {
    console.log(`  ${CANONICAL_MEMORY_FILE} already exists — left unchanged`)
    return
  }
  writeFileSync(memoriaPath, createMemoriaProyectoSeed(project), "utf-8")
  console.log(`  Created ${CANONICAL_MEMORY_FILE} (canonical portable memory)`)
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
