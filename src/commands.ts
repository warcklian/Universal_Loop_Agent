/**
 * Single source of truth for the uagent CLI surface.
 * `cli.ts` must wire each name 1:1; `verify` checks docs/scripts against this list.
 */

export interface CommandSpec {
  name: string
  summary: string
  detail: string
}

export const COMMANDS: CommandSpec[] = [
  {
    name: "init",
    summary: "Detect stack; write YAML + canonical memory + stubs; never overwrite memory with substance",
    detail: "Scans the target project, writes universal-agent.yaml when missing, seeds PROJECT_MEMORY.md / CHANGE_CONTROL.md if absent, and creates .uagent/memory stubs that only point at the canonical file.",
  },
  {
    name: "detect",
    summary: "Print detected stack without writing files",
    detail: "JSON dump of languages, frameworks, runtime, package managers, layout hints, and build commands.",
  },
  {
    name: "generate",
    summary: "Generate AGENTS.md from universal-agent.yaml",
    detail: "Supports --force, --dry-run, --adapters, --init-memory. Adapters are thin pointers at AGENTS.md / PROJECT_MEMORY.md.",
  },
  {
    name: "validate",
    summary: "Parse and validate universal-agent.yaml",
    detail: "Reports configured sections without writing.",
  },
  {
    name: "upgrade",
    summary: "Migrate legacy filenames and rewrite references (rename only — never delete)",
    detail:
      "Policy (docs/file-lifecycle.md): create if missing, update features in place, rename legacy names — never delete. Prefer --dry-run then --yes. Do not use --prune; it is ignored unless --i-accept-deletes. setup-all never passes --prune. Skips toolkit root, nested toolkit, exclude_paths, frozen payloads; keeps diary history.",
  },
  {
    name: "update",
    summary: "Self-update this toolkit from origin (fast-forward only)",
    detail: "Checks remote; merges with --ff-only when clean and behind. Never rewrites published history.",
  },
  {
    name: "sync",
    summary: "Write multi-editor adapter files that point at AGENTS.md",
    detail: "CLAUDE.md, Copilot, Gemini, .cursorrules pointers. Use --force to overwrite.",
  },
  {
    name: "adopt",
    summary: "Import existing editor instructions into universal-agent.yaml",
    detail: "Picks the richest AGENTS/CLAUDE/.cursorrules/etc. text and folds it into YAML when missing.",
  },
  {
    name: "plan-from",
    summary: "Turn an idea/plan file into phases in the canonical memory",
    detail:
      "Accepts idea.md, plan.md, or repo-named *Plan* / *idea* files (.md/.txt). Skips when ## Phases already has a checklist unless --force.",
  },
  {
    name: "doctor",
    summary: "Readiness score for loop + memory + change control",
    detail: "Checks YAML, AGENTS.md, canonical memory, adapters, phases, idea/plan (including *_Plan.md), and contract rules.",
  },
  {
    name: "verify",
    summary: "Self-check: docs/scripts vs registered CLI commands",
    detail: "Scans README, Index, setup-all, wrappers. Exit 1 when surface is inconsistent.",
  },
  {
    name: "reconcile",
    summary: "Write .uagent/AGENTS_RECONCILE.md brief for the AI when AGENTS.md is stale",
    detail: "Compares AGENTS.md against MANDATED_RULES. WARN-only in setup-all; does not rewrite AGENTS.md itself.",
  },
  {
    name: "ensure-idea",
    summary: "Create idea.md from template when missing",
    detail: "Never overwrites an existing idea/plan file.",
  },
  {
    name: "write-prompt",
    summary: "Remove obsolete LOOP_START_PROMPT.txt",
    detail: "Cleanup alias: load AGENTS.md activates the loop; does not create a paste file.",
  },
  {
    name: "coord:register",
    summary: "Register an agent session; returns agentId for locks/claims",
    detail: "Writes .uagent/agents.json (gitignored). Required before lock/claim.",
  },
  {
    name: "coord:unregister",
    summary: "Unregister agent and release its locks/claims",
    detail: "Safe cleanup when a chat ends.",
  },
  {
    name: "coord:heartbeat",
    summary: "Renew lock and claim TTL for this agent",
    detail: "Call periodically (e.g. every 5–10 min) while working. Default TTL 30 min.",
  },
  {
    name: "coord:lock",
    summary: "Acquire exclusive file locks (TTL)",
    detail: "Stores .uagent/locks/*.json. Fails if another live lock holds the file.",
  },
  {
    name: "coord:unlock",
    summary: "Release file locks held by this agent",
    detail: "Pass --files or unlock all held by agentId.",
  },
  {
    name: "coord:locks",
    summary: "List current file locks",
    detail: "Shows owner, phase, heartbeat, stale flag.",
  },
  {
    name: "coord:conflicts",
    summary: "Warn if files are locked by another live agent",
    detail: "Exit 1 when conflicts exist (non-stale).",
  },
  {
    name: "coord:cleanup",
    summary: "Remove stale locks and stale Active claims past TTL",
    detail: "Does not delete PROJECT_MEMORY content other than stale claim rows.",
  },
  {
    name: "coord:claim",
    summary: "Claim a phase in PROJECT_MEMORY.md Active claims",
    detail: "Blocks other agents from claiming/marking that phase until release or TTL stale.",
  },
  {
    name: "coord:claim:release",
    summary: "Release a phase claim in canonical memory",
    detail: "Call when phase is done or work stops.",
  },
]

export const COMMAND_NAMES: string[] = COMMANDS.map((c) => c.name)

export function getCommand(name: string): CommandSpec | undefined {
  return COMMANDS.find((c) => c.name === name)
}
