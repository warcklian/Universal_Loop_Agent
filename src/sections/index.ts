import type { SourceConfig } from "../schema.ts"
import { CHANGE_CONTROL_FILE, CHANGE_ID_PREFIX, CHANGE_STATES, changeControlRules } from "../change-control.ts"
import { loopActivationLines } from "../loop-defaults.ts"

/** Canonical portable memory file at project root (legacy name is migrated on init). */
const CANONICAL_MEMORY_DEFAULT = "PROJECT_MEMORY.md"

function list(items: string[]): string {
  return items.join("\n")
}

function kv(label: string, value: string): string {
  return `- **${label}:** \`${value}\``
}

function bullet(text: string): string {
  return `- ${text}`
}

export function sectionOverview(s: SourceConfig): string {
  const lines = [`# ${s.project.name}`]
  if (s.project.description) lines.push("", s.project.description)

  const { stack } = s.project
  const meta: string[] = []
  if (stack.languages?.length) meta.push(`**Languages:** ${stack.languages.join(", ")}`)
  if (stack.framework?.length) meta.push(`**Frameworks:** ${stack.framework.join(", ")}`)
  if (stack.runtime?.length) meta.push(`**Runtime:** ${stack.runtime.join(", ")}`)
  if (stack.package_managers?.length) meta.push(`**Package Managers:** ${stack.package_managers.join(", ")}`)
  if (stack.databases?.length) meta.push(`**Databases:** ${stack.databases.join(", ")}`)
  if (meta.length) lines.push("", ...meta)

  return lines.join("\n")
}

export function sectionBuild(s: SourceConfig): string | null {
  const b = s.build
  if (!b) return null
  const cmds: string[] = []
  if (b.install) cmds.push(kv("Install dependencies", b.install))
  if (b.dev) cmds.push(kv("Start dev server", b.dev))
  if (b.build) cmds.push(kv("Build for production", b.build))
  if (b.preview) cmds.push(kv("Preview build", b.preview))
  if (b.lint) cmds.push(kv("Lint", b.lint))
  if (b.typecheck) cmds.push(kv("Type check", b.typecheck))
  if (b.format) cmds.push(kv("Format code", b.format))
  if (!cmds.length) return null
  return ["## Build & Run", "", list(cmds)].join("\n")
}

export function sectionTesting(s: SourceConfig): string | null {
  const t = s.testing
  if (!t) return null
  const items: string[] = []
  if (t.unit) items.push(kv("Unit tests", t.unit))
  if (t.e2e) items.push(kv("E2E tests", t.e2e))
  if (t.integration) items.push(kv("Integration tests", t.integration))
  if (t.coverage) items.push(kv("Coverage", t.coverage))
  if (t.lint) items.push(kv("Lint tests", t.lint))
  if (!items.length) return null
  return ["## Testing", "", list(items)].join("\n")
}

export function sectionCodeStyle(s: SourceConfig): string | null {
  const c = s.code_style
  if (!c) return null
  const items: string[] = []
  if (c.indent !== undefined) items.push(bullet(`Indentation: ${c.indent} spaces`))
  if (c.quotes) items.push(bullet(`Quotes: ${c.quotes}`))
  if (c.semicolons !== undefined) items.push(bullet(`Semicolons: ${c.semicolons ? "yes" : "no"}`))
  if (c.max_line_length) items.push(bullet(`Max line length: ${c.max_line_length}`))
  if (c.conventions?.length) {
    items.push("", "Conventions:")
    c.conventions.forEach((conv) => items.push(bullet(conv)))
  }
  if (!items.length) return null
  return ["## Code Style", "", list(items)].join("\n")
}

export function sectionSecurity(s: SourceConfig): string | null {
  const rules = s.security?.rules
  if (!rules?.length) return null
  return ["## Security", "", rules.map(bullet).join("\n")].join("\n")
}

export function sectionGit(s: SourceConfig): string | null {
  const g = s.git
  if (!g) return null
  const items: string[] = []
  if (g.commit_format) items.push(bullet(`**Commit format:** ${g.commit_format}`))
  if (g.branch_format) items.push(bullet(`**Branch format:** \`${g.branch_format}\``))
  if (g.pr_template) items.push(bullet(`**PR template:** ${g.pr_template}`))
  if (g.rules?.length) g.rules.forEach((r) => items.push(bullet(r)))
  if (!items.length) return null
  return ["## Git Conventions", "", list(items)].join("\n")
}

export function sectionAgentLoop(s: SourceConfig): string | null {
  const loop = s.agent_loop
  if (!loop) return null
  const canonical = s.multi_agent?.memory?.canonical_file || CANONICAL_MEMORY_DEFAULT
  const lines = ["## Agent Loop"]
  lines.push("")
  lines.push("This section defines how the agent loop behaves. Load this file to activate loop mode.")
  lines.push("")

  if (loop.max_iterations !== undefined) lines.push(bullet(`**Max iterations:** ${loop.max_iterations}`))
  if (loop.timeout_seconds !== undefined) lines.push(bullet(`**Timeout:** ${loop.timeout_seconds}s`))
  if (loop.doom_loop_detection) lines.push(bullet("**Doom loop detection:** enabled — stops if no progress in 3 iterations"))

  if (loop.rules?.length) {
    lines.push("")
    lines.push("### Loop Rules")
    lines.push("")
    loop.rules.forEach((r) => {
      lines.push(bullet(r.instruction))
    })
  }

  lines.push("")
  lines.push(...loopActivationLines(canonical))

  return lines.join("\n")
}

/**
 * Local change control canon: register the change, document it in detail, then implement.
 * Rendered for every project unless `change_control.enabled: false`.
 */
export function sectionChangeControl(s: SourceConfig): string | null {
  const cc = s.change_control
  if (cc?.enabled === false) return null

  const file = cc?.file || CHANGE_CONTROL_FILE
  const idPrefix = cc?.id_prefix || CHANGE_ID_PREFIX
  const canonical = s.multi_agent?.memory?.canonical_file || CANONICAL_MEMORY_DEFAULT

  const lines = ["## Change Control (local)"]
  lines.push("")
  lines.push("Local change control for every change. No code before a registered row and a documentation update.")
  lines.push("")
  lines.push(bullet(`**Register file:** \`${file}\` (project root, travels with the repo)`))
  lines.push(bullet(`**ID format:** \`${idPrefix}-0001\`, \`${idPrefix}-0002\`, … (sequential, never reused)`))
  lines.push(bullet(`**States:** ${CHANGE_STATES.map((st) => `\`${st}\``).join(" → ")}`))
  lines.push("")
  lines.push("### Rules")
  lines.push("")
  changeControlRules(canonical).forEach((rule, i) => {
    lines.push(`${i + 1}. ${rule}`)
  })

  if (cc?.rules?.length) {
    lines.push("")
    lines.push("### Project-Specific Change Rules")
    lines.push("")
    cc.rules.forEach((r) => lines.push(bullet(r)))
  }

  return lines.join("\n")
}

export function sectionMultiAgent(s: SourceConfig): string | null {
  const ma = s.multi_agent
  if (!ma) return null
  const lines = ["## Multi-Agent Coordination"]
  lines.push("")

  if (ma.memory) {
    const canonical = ma.memory.canonical_file || CANONICAL_MEMORY_DEFAULT
    lines.push("### Shared Memory")
    lines.push("")
    lines.push(bullet(`**Enabled:** ${ma.memory.enabled !== false ? "yes" : "no"}`))
    lines.push(bullet(`**Canonical handoff (read/update):** \`${canonical}\` at project root — portable across machines`))
    if (ma.memory.path) {
      lines.push(bullet(`**uagent stubs path:** \`${ma.memory.path}\` (pointers only; do not duplicate the diary there)`))
    }
    if (ma.memory.auto_sync) lines.push(bullet("**Auto-sync:** enabled — keep `PROJECT_MEMORY.md` (canonical) up to date after substantive work"))
    lines.push("")
    lines.push("At the start of substantive work, read the canonical memory file. After finishing a delivery, update it (date, open items, short summary). Editor-local memory does not travel with the repo.")
  }

  if (ma.ownership?.length) {
    lines.push("")
    lines.push("### Ownership Matrix")
    lines.push("")
    lines.push("Each agent is responsible for specific file domains. Do not edit files outside your domain.")
    lines.push("")
    ma.ownership.forEach((o) => {
      const label = o.integrator ? `${o.agent} (integrator — runs last)` : o.agent
      lines.push(`- **${label}:** ${o.globs.map((g) => `\`${g}\``).join(", ")}`)
    })
  }

  if (ma.conflict) {
    lines.push("")
    lines.push("### Conflict Prevention")
    lines.push("")
    if (ma.conflict.file_locking) lines.push(bullet("**File locking:** enabled — lock files before editing"))
    if (ma.conflict.auto_detect) lines.push(bullet("**Auto-detect collisions:** enabled — warn on concurrent edits"))
    if (ma.conflict.strategy) lines.push(bullet(`**Merge strategy:** ${ma.conflict.strategy}`))
  }

  return lines.join("\n")
}

export function sectionRules(s: SourceConfig): string | null {
  const rules = s.rules
  if (!rules?.length) return null
  const lines = ["## Project-Specific Rules", ""]
  rules.forEach((r) => {
    lines.push(`### ${r.name}`)
    lines.push("")
    if (r.glob) lines.push(`**Applies to:** \`${r.glob}\``)
    lines.push("")
    lines.push(r.instructions.trim())
    lines.push("")
  })
  return lines.join("\n")
}

export function sectionUniversal(s: SourceConfig): string | null {
  if (!s.universal_instructions) return null
  return ["## Additional Instructions", "", s.universal_instructions.trim()].join("\n")
}

/**
 * Autonomous adaptive delivery: research-backed methodology, closed-phase review,
 * context preservation when running the .bat entry points, and multi-agent
 * orchestration coordinated through PROJECT_MEMORY.md (no extra files).
 */
export function sectionAutonomousDelivery(s: SourceConfig): string | null {
  const r = s.research
  const v = s.validation
  const c = s.context_preservation
  const o = s.multi_agent?.orchestration
  if (!r && !v && !c && !o) return null

  const lines = ["## Autonomous Adaptive Delivery (ULA)"]
  lines.push("")
  lines.push("This project is driven by an autonomous, adaptive loop agent. Load `AGENTS.md` in any AI editor (OpenCode, Cursor, Copilot, Claude Code, Windsurf, etc.) to activate it.")
  lines.push("")

  if (r) {
    lines.push("### 1. Autonomous research — methodology, language, framework")
    lines.push("")
    lines.push("- Never implement `plan.md` blindly. Before each phase, research whether the proposed methodology, programming language and framework are the best choice to deliver a quality product, fast and scalable.")
    if (r.investigator_mark) lines.push(`- Mark which model/agent performed the research, so every agent knows who did it: ${r.investigator_mark}.`)
    else lines.push("- Mark which model/agent performed the research, so every agent knows who did it.")
    if (r.cross_validation) lines.push(`- Any other agent reading the research may verify it: give the ok if it agrees, or add feedback with improvements the researcher did not propose or take for granted: ${r.cross_validation}.`)
    else lines.push("- Any other agent reading the research may verify it: give the ok if it agrees, or add feedback with improvements the researcher did not propose or take for granted.")
    if (r.functional_proof) lines.push(`- Research counts as good only when the resulting solution is functional, not only valid on paper: ${r.functional_proof}.`)
    else lines.push("- Research counts as good only when the resulting solution is functional, not only valid on paper.")
    lines.push("")
  }

  if (v) {
    lines.push("### 2. Closed-phase review — evidence-based closure, not assumptions")
    lines.push("")
    lines.push("- Run `plan.md` in ordered phases. Before marking a phase closed, review what is already closed: is it well done? Did any agent omit something?")
    if (v.closed_phase_review) lines.push(`- ${v.closed_phase_review}`)
    else lines.push("- A closed phase is not assumed correct by default.")
    lines.push("- A phase is closed only when: code for the phase is in place, relevant tests/checks for that phase pass, and `PROJECT_MEMORY.md` marks the phase `[x]` with a brief note of the paths touched.")
    if (v.functional_not_just_validated) lines.push(`- ${v.functional_not_just_validated}`)
    else lines.push("- If two or more agents validated and agreed that the implemented alternative is functional (not only validated), the phase can be closed.")
    lines.push("- Even when closed, it is not omitted from review when the user requests a system analysis or another agent runs `AGENTS.md`.")
    if (v.independent_verifier) lines.push(`- ${v.independent_verifier}`)
    else lines.push("- The agent is not the only judge of its own success: acceptance criteria must be provable by an independent mechanism.")
    lines.push("")
  }

  if (c) {
    lines.push("### 3. Context preservation when running the .bat entry points")
    lines.push("")
    lines.push("- Before running `init.bat`, `setup-all.bat` or `generate.bat`, check whether `AGENTS.md`, `PROJECT_MEMORY.md`, `CHANGE_CONTROL.md`, `idea.md` and `plan.md` (or `Universal_Loop_Agent_Plan.md`) already exist.")
    lines.push("- Never replace those files with new versions just because. Complement or update what exists; create it only when missing.")
    lines.push("- Never lose the project's progress context through an unconsidered overwrite.")
    if (c.rule) lines.push(`- ${c.rule}`)
    lines.push("")
  }

  if (o) {
    lines.push("### 4. Parallel multi-agent orchestration (PERMANENT MEMORY AS COORDINATOR)")
    lines.push("")
    lines.push("- Use `PROJECT_MEMORY.md` as the permanent memory and as the multi-agent coordinator; do not create unnecessary orchestrator files.")
    lines.push("- Each agent reads the memory before starting, so every agent knows what the others are doing: independent work, together, without getting in each other's way.")
    lines.push("- Each agent owns specific file domains (Ownership Matrix) and does not edit outside its domain.")
    lines.push("- File locking, auto-detect of collisions and topological merge strategy are enabled.")
    if (o.shared_memory) lines.push(`- Shared memory: \`${o.shared_memory}\`.`)
    lines.push("")
  }

  lines.push("### Loop rules (operating cycle)")
  lines.push("")
  lines.push("- Read files before editing them.")
  lines.push("- Act → observe the real result → adapt the next step (closed execution cycle).")
  lines.push("- If a solution fails, do not repeat it indefinitely: identify the cause, propose alternatives, and choose a test that distinguishes them.")
  lines.push("- After every substantive change run the project tests, linter and type checker.")
  lines.push("- Register every authorized change in `CHANGE_CONTROL.md` (row, date, scope, status `authorized`) and document in detail before writing code: what, why, files, steps, acceptance and verification. No row and no docs, no code.")
  lines.push("- Close a phase only when code + checks pass + `PROJECT_MEMORY.md` marks it `[x]` with paths touched.")
  lines.push("- If there is no progress in 3 iterations, stop and ask the user (doom-loop detection). Never ask the user to say \"continue\" between successful phases.")
  lines.push("- Explain what changed and why at phase boundaries and at final completion.")

  return lines.join("\n")
}
