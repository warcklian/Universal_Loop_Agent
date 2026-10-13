import { existsSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

/**
 * Local change control canon.
 * Every change is registered first and documented in detail before it is implemented,
 * so any agent can develop it from the repository alone (no chat history needed).
 */

/** Register file for local change control. Lives at project root and travels with the repo. */
export const CHANGE_CONTROL_FILE = "CHANGE_CONTROL.md"

/** Sequential ID prefix for change entries — CH-0001, CH-0002, … */
export const CHANGE_ID_PREFIX = "CH"

/** Ordered states used in the register. */
export const CHANGE_STATES = ["authorized", "in progress", "implemented", "verified"] as const

/**
 * Canon rules rendered into the generated AGENTS.md (Change Control section)
 * and seeded into universal-agent.yaml (change_control.rules).
 */
export function changeControlRules(canonicalMemory = "PROJECT_MEMORY.md"): string[] {
  return [
    `**Register before coding** — every authorized change starts as a row in \`${CHANGE_CONTROL_FILE}\` with ID, date, scope and status \`authorized\`. No row, no code.`,
    "**Document before implementing** — before writing code, update the documentation in detail so any agent with only the repository (no chat history) can develop it: what and why, files/modules affected, exact steps, acceptance criteria and how to verify.",
    "**Docs are the spec** — the documentation update is part of the change, not an afterthought. When behavior changes, the docs that describe it change in the same delivery.",
    "**Close only when verified** — set the row to `implemented` (then `verified`) only after the code is in place, the tests/checks for that change pass, and the docs match the implemented behavior. Record the files touched and the verification used.",
    `**Local and portable** — \`${CHANGE_CONTROL_FILE}\` lives at project root and travels with the repo; it is the change history that complements \`${canonicalMemory}\` (phases/handoff) and \`Index.md\` (navigation).`,
  ]
}

/** Body seeded into the project-root register when the project has none. */
export function createChangeControlSeed(canonicalMemory: string): string {
  return [
    "# Change control (local)",
    "",
    "Local register of project changes. Lives at the project root and travels with the repository.",
    `It complements \`${canonicalMemory}\` (phases / handoff) and \`Index.md\` (navigation):`,
    "here you record what changed, why, and how it was verified.",
    "",
    "**Canon rule** (see `AGENTS.md` → *Change Control*): no code change without a row here,",
    "and the documentation is updated **before** implementing.",
    "",
    "## How to use it",
    "",
    "1. **Before coding** — add a row with status `authorized`.",
    "2. **Before implementing** — update the documentation in detail: what and why, files",
    "   affected, steps, acceptance criteria, and how to verify. It must be enough for any",
    "   agent to develop it from the repository alone.",
    "3. **When done** — mark `implemented` → `verified` and record files and verification.",
    "",
    "## States",
    "",
    "`authorized` → `in progress` → `implemented` → `verified` (`blocked` if there is an impediment).",
    "",
    "## Register",
    "",
    "| ID | Date | Scope | State | Files | Verification |",
    "|----|------|-------|-------|-------|--------------|",
    "| CH-0001 | _YYYY-MM-DD_ | _What was authorized_ | authorized | _paths_ | _commands / checks_ |",
    "",
    "_The ID is sequential and never reused._",
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
