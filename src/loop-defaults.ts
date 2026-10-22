import type { AgentLoopRule } from "./schema.ts"
import { CHANGE_CONTROL_FILE } from "./change-control.ts"
import { COORD_MANDATED_RULES } from "./coordination.ts"

/**
 * Mandated autonomy + multi-agent coordination contract — emitted verbatim in AGENTS.md
 * and checked by reconcile/doctor. Compose with change-control gates; do not drop either side.
 */
export const MANDATED_RULES: string[] = [
  "Read the canonical memory first; resume from the first unchecked phase, never redo finished phases",
  "Derive ordered phases and implement them one at a time without waiting for the user to say continue",
  "Each phase is done only when code is in place, checks pass and the phase checkbox is marked",
  "Run the project's configured tests and checks after every substantive change",
  "Batch every blocker question into one upfront request for values only the user can provide, such as credentials, IPs, ports or external accounts, then continue autonomously",
  "Never stop to report progress between phases; report once at the end, or when genuinely blocked",
  "Do not push, create remotes or rewrite published history without an explicit request",
  ...COORD_MANDATED_RULES,
]

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/^#+\s*/gm, "")
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** Return mandated rules not covered (substring match after normalize). */
export function missingContractRules(current: string): string[] {
  const hay = normalizeForMatch(current)
  return MANDATED_RULES.filter((rule) => !hay.includes(normalizeForMatch(rule)))
}

/**
 * Default loop rules for consumer projects (init / yaml-generator).
 * Encode autonomous phased delivery + portable memory + tool boundary + change control.
 */
export function defaultConsumerLoopRules(canonicalMemory = "PROJECT_MEMORY.md"): AgentLoopRule[] {
  return [
    {
      instruction:
        `At session start: read \`${canonicalMemory}\`, then any plan/idea files (idea.md, *Plan*.md, *.txt, or paths the user attached). Chat text counts as instructions too.`,
      description: "Portable memory + plan/idea are the source of truth for what to build",
    },
    {
      instruction:
        `If \`${canonicalMemory}\` already has completed phases, resume from the first unchecked phase — do not redo finished work.`,
      description: "Chat may restart; disk memory is the resume point",
    },
    {
      instruction:
        `Change control gate: before implementing any authorized change, first (1) add a row to \`${CHANGE_CONTROL_FILE}\` (ID, date, scope, status \`authorized\`) and (2) update the documentation in detail — what and why, files affected, steps, acceptance criteria, how to verify — so any agent with only the repository can develop it. No row and no docs update, no code.`,
      description: "Register and documentation precede implementation; the repo is the only handoff",
    },
    {
      instruction:
        "Autonomous phased delivery: break the plan into ordered phases. Implement one phase fully, run the relevant tests/checks, mark that phase done in the canonical memory (and the plan if present), then immediately start the next phase — do not wait for the user to say continue.",
      description: "One user instruction should drive the project as far as safely possible",
    },
    {
      instruction:
        `Phase Definition of Done: (1) code for the phase is in place, (2) relevant tests/checks for that phase pass, (3) \`${canonicalMemory}\` marks the phase [x] and notes paths touched, (4) only then advance.`,
      description: "Do not mark a phase complete on partial work",
    },
    {
      instruction:
        "Decide alone whenever possible. Batch every blocker question into one upfront request for values only the user can provide (credentials, IPs, ports, external accounts), then continue autonomously.",
      description: "One upfront ask; then keep going",
    },
    {
      instruction:
        "Only pause when blocked: missing secrets/credentials, irreversible destructive action, genuine product ambiguity with multiple valid choices, or doom-loop (no progress in 3 iterations).",
      description: "Avoid chatty stop-and-ask for routine next steps",
    },
    {
      instruction: "Always read files before editing them",
      description: "Never edit blind — understand the current state first",
    },
    {
      instruction:
        "Run the project's configured tests and checks after every substantive change; develop and fix tests as needed. Escalate only when a blocker needs a user-provided value.",
      description: "Verify correctness before advancing",
    },
    {
      instruction: "Run linter and type checker after edits when the project defines them",
      description: "Catch errors early",
    },
    {
      instruction:
        `Keep \`${canonicalMemory}\` updated as you go (Current phase, Done, In progress, Blocked). Editor chat memory does not travel with the repo.`,
      description: "Portable continuity across machines and sessions",
    },
    {
      instruction:
        "Tool boundary: folders/files used only to generate AGENTS.md (e.g. a nested uagent / Universal_Loop_Agent toolkit) are NOT part of the product. Do not import them, do not list them as product modules in Index.md, do not couple build scripts to them. Product-owned artifacts are the canonical memory, AGENTS.md, universal-agent.yaml, .uagent/memory stubs, and optional idea.md.",
      description: "uagent is a portable tool; the developed project must stand alone",
    },
    {
      instruction:
        `After every substantive delivery, close the row in \`${CHANGE_CONTROL_FILE}\` (\`implemented\` → \`verified\`, with files touched and verification) and sync the project docs that the product owns (\`${canonicalMemory}\`, Index.md, plan, README) for structure/behavior changes — not the toolkit folder.`,
      description: "Documentation and register stay with the product, in the same delivery",
    },
    {
      instruction:
        "Never stop to report progress between phases; report once at the end, or when genuinely blocked. Do not push, create remotes or rewrite published history without an explicit request.",
      description: "Single end report; no history rewriting",
    },
    {
      instruction:
        "Before editing code or starting a phase: uagent coord:register, claim the phase in PROJECT_MEMORY.md Active claims, and uagent coord:lock the files. Never mark [x] a phase held by another live claim/lock. Heartbeat while working; unlock and release claim when done.",
      description: "Mandatory multi-agent coordination (locks + claims)",
    },
  ]
}

/** Short activation blurb embedded in generated AGENTS.md */
export function loopActivationLines(canonicalMemory = "PROJECT_MEMORY.md"): string[] {
  return [
    "### How to activate",
    "",
    "- **Loop mode:** Load / attach this `AGENTS.md` in your AI editor or chat (Cursor, Claude Code, OpenCode, Copilot, Windsurf, etc.). That alone activates the loop — no extra prompt to paste.",
    "- **Prompt mode:** Work without loading this file — no loop behavior activates.",
    `- **Memory duo:** \`AGENTS.md\` = loop rules in-chat; \`${canonicalMemory}\` = durable portable handoff on disk. Use both.`,
    `- **Change control:** \`${CHANGE_CONTROL_FILE}\` = local register of every change (row before code, docs before implementation).`,
    "",
    "### Autonomous phased delivery",
    "",
    `1. Read \`${canonicalMemory}\` + plan/idea (files or chat).`,
    "2. Derive an ordered phase list if the plan is not already phased.",
    `3. For each phase: implement → test → mark done in \`${canonicalMemory}\` → next phase.`,
    "4. **Definition of Done per phase:** code + checks pass + memory checkbox `[x]` + brief note of paths.",
    "5. **Resume:** if the chat restarted, continue from the first unchecked phase — do not redo completed ones.",
    "6. Stop only when the plan is complete, or when blocked (secrets / irreversible / ambiguity / doom-loop).",
    "7. Do **not** ask the user to say \"continue\" between successful phases.",
    "8. Batch blocker questions once, upfront; then continue autonomously.",
    "9. Report once at the end, or when genuinely blocked — not between phases.",
    "10. Do not push, create remotes or rewrite published history without an explicit request.",
    "",
    "### Tool vs product",
    "",
    `- **Product (belongs in the project):** \`${canonicalMemory}\`, \`AGENTS.md\`, \`universal-agent.yaml\`, \`.uagent/memory/\`, optional \`idea.md\`.`,
    "- **Toolkit (optional helper, not product code):** any nested generator folder used only to create/update those files. Never treat it as an application module.",
    "",
    "### Autonomous delivery contract",
    "",
    ...MANDATED_RULES.map((r) => `- ${r}`),
    "",
    "### Portable canon vs host editor rules",
    "",
    "The files `AGENTS.md` + canonical memory (+ `universal-agent.yaml`) are the portable contract. Optional host-editor profile rules may only ensure this toolkit/canon exists; they must not create a second handoff or override loop/memory rules here. Agents without host profile rules follow only this canon. Host editor rules must not fork canonical memory.",
  ]
}
