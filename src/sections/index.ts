import type { SourceConfig } from "../schema.ts"
import { loopActivationLines } from "../loop-defaults.ts"

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
  const lines = ["## Agent Loop"]
  lines.push("")
  lines.push(
    "This section defines autonomous loop behavior. Load this file in chat to activate loop mode together with portable project memory.",
  )
  lines.push("")

  if (loop.max_iterations !== undefined) lines.push(bullet(`**Max iterations:** ${loop.max_iterations}`))
  if (loop.timeout_seconds !== undefined) lines.push(bullet(`**Timeout:** ${loop.timeout_seconds}s`))
  if (loop.doom_loop_detection) {
    lines.push(bullet("**Doom loop detection:** enabled — stop if no progress in 3 iterations"))
  }

  if (loop.rules?.length) {
    lines.push("")
    lines.push("### Loop Rules")
    lines.push("")
    loop.rules.forEach((r) => {
      lines.push(bullet(r.instruction))
    })
  }

  lines.push("")
<<<<<<< HEAD
  lines.push(...loopActivationLines())
=======
  lines.push("### How to use")
  lines.push("")
  lines.push("- **Loop mode:** Load this file in your agent (Claude Code, Cursor, OpenCode, etc.)")
  lines.push("- **Prompt mode:** Work without loading this file — no loop behavior activates")
  lines.push("- **AGENTS.md** = agent rules/loop only; project handoff memory is `MEMORIA_PROYECTO.md` (or `multi_agent.memory.canonical_file`)")
>>>>>>> 22bb3ef495b2b824adfa337c84e9d44877d80406

  return lines.join("\n")
}

export function sectionMultiAgent(s: SourceConfig): string | null {
  const ma = s.multi_agent
  if (!ma) return null
  const lines = ["## Multi-Agent Coordination"]
  lines.push("")

  if (ma.memory) {
<<<<<<< HEAD
    const canonical = ma.memory.canonical_file || "PROJECT_MEMORY.md"
=======
    const canonical = ma.memory.canonical_file || "MEMORIA_PROYECTO.md"
>>>>>>> 22bb3ef495b2b824adfa337c84e9d44877d80406
    lines.push("### Shared Memory")
    lines.push("")
    lines.push(bullet(`**Enabled:** ${ma.memory.enabled !== false ? "yes" : "no"}`))
    lines.push(bullet(`**Canonical handoff (read/update):** \`${canonical}\` at project root — portable across machines`))
    if (ma.memory.path) {
      lines.push(bullet(`**uagent stubs path:** \`${ma.memory.path}\` (pointers only; do not duplicate the diary there)`))
    }
<<<<<<< HEAD
    if (ma.memory.auto_sync) {
      lines.push(bullet(`**Auto-sync:** enabled — keep \`${canonical}\` (canonical) up to date after substantive work`))
    }
=======
    if (ma.memory.auto_sync) lines.push(bullet("**Auto-sync:** enabled — keep `MEMORIA_PROYECTO.md` (canonical) up to date after substantive work"))
>>>>>>> 22bb3ef495b2b824adfa337c84e9d44877d80406
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
