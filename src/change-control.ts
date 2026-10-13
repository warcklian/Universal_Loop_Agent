import { existsSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

/**
 * Local change control canon.
 * Every change is registered first and documented in detail before it is implemented,
 * so any agent can develop it from the repository alone (no chat history needed).
 */

/** Register file for local change control. Lives at project root and travels with the repo. */
export const CHANGE_CONTROL_FILE = "CONTROL_CAMBIOS.md"

/** Sequential ID prefix for change entries — CH-0001, CH-0002, … */
export const CHANGE_ID_PREFIX = "CH"

/** Ordered states used in the register. */
export const CHANGE_STATES = ["autorizado", "en curso", "implementado", "verificado"] as const

/**
 * Canon rules rendered into the generated AGENTS.md (Change Control section)
 * and seeded into universal-agent.yaml (change_control.rules).
 */
export function changeControlRules(canonicalMemory = "PROJECT_MEMORY.md"): string[] {
  return [
    `**Register before coding** — every authorized change starts as a row in \`${CHANGE_CONTROL_FILE}\` with ID, date, scope and status \`autorizado\`. No row, no code.`,
    "**Document before implementing** — before writing code, update the documentation in detail so any agent with only the repository (no chat history) can develop it: what and why, files/modules affected, exact steps, acceptance criteria and how to verify.",
    "**Docs are the spec** — the documentation update is part of the change, not an afterthought. When behavior changes, the docs that describe it change in the same delivery.",
    "**Close only when verified** — set the row to `implementado` (then `verificado`) only after the code is in place, the tests/checks for that change pass, and the docs match the implemented behavior. Record the files touched and the verification used.",
    `**Local and portable** — \`${CHANGE_CONTROL_FILE}\` lives at project root and travels with the repo; it is the change history that complements \`${canonicalMemory}\` (phases/handoff) and \`Index.md\` (navigation).`,
  ]
}

/** Body seeded into the project-root register when the project has none. */
export function createChangeControlSeed(canonicalMemory: string): string {
  return [
    "# Control de cambios (local)",
    "",
    "Registro local de cambios del proyecto. Vive en la raíz y viaja con el repositorio.",
    `Complementa \`${canonicalMemory}\` (fases / handoff) e \`Index.md\` (navegación):`,
    "aquí se anota qué cambió, por qué y cómo se verificó.",
    "",
    "**Regla canon** (ver `AGENTS.md` → *Change Control*): ningún cambio de código sin una fila",
    "aquí, y la documentación se actualiza **antes** de implementar.",
    "",
    "## Cómo usarlo",
    "",
    "1. **Antes de programar** — agrega una fila con estado `autorizado`.",
    "2. **Antes de implementar** — actualiza la documentación en detalle: qué y por qué, archivos",
    "   afectados, pasos, criterios de aceptación y cómo verificar. Debe bastar para que cualquier",
    "   agente lo desarrolle solo con el repositorio.",
    "3. **Al terminar** — marca `implementado` → `verificado` y anota archivos y verificación.",
    "",
    "## Estados",
    "",
    "`autorizado` → `en curso` → `implementado` → `verificado` (`bloqueado` si hay impedimento).",
    "",
    "## Registro",
    "",
    "| ID | Fecha | Alcance | Estado | Archivos | Verificación |",
    "|----|-------|---------|--------|----------|--------------|",
    "| CH-0001 | _AAAA-MM-DD_ | _Qué se autorizó_ | autorizado | _rutas_ | _comandos / checks_ |",
    "",
    "_El ID es secuencial y nunca se reutiliza._",
    "",
  ].join("\n")
}

/**
 * Create the register at project root only when missing (never overwrites).
 * Seeded together with the canonical memory file so both travel together.
 */
export function ensureChangeControlRegister(targetDir: string, canonicalMemory: string): void {
  const path = join(resolve(targetDir), CHANGE_CONTROL_FILE)
  if (existsSync(path)) return
  writeFileSync(path, createChangeControlSeed(canonicalMemory), "utf-8")
  console.log(`  Created ${CHANGE_CONTROL_FILE} (local change control register)`)
}
