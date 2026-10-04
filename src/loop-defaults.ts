import type { AgentLoopRule } from "./schema.ts"
import { loopStartPrompt } from "./idea-template.ts"

/**
 * Default loop rules for consumer projects (init / yaml-generator).
 * Encode autonomous phased delivery + portable memory + tool boundary.
 */
export function defaultConsumerLoopRules(): AgentLoopRule[] {
  return [
    {
      instruction:
        "At session start: read PROJECT_MEMORY.md, then any plan/idea files (idea.md, *.md, *.txt, or paths the user attached). Chat text counts as instructions too.",
      description: "Portable memory + plan/idea are the source of truth for what to build",
    },
    {
      instruction:
        "If PROJECT_MEMORY.md already has completed phases, resume from the first unchecked phase — do not redo finished work.",
      description: "Chat may restart; disk memory is the resume point",
    },
    {
      instruction:
        "Autonomous phased delivery: break the plan into ordered phases. Implement one phase fully, run the relevant tests/checks, mark that phase done in PROJECT_MEMORY.md (and the plan if present), then immediately start the next phase — do not wait for the user to say continue.",
      description: "One user instruction should drive the project as far as safely possible",
    },
    {
      instruction:
        "Phase Definition of Done: (1) code for the phase is in place, (2) relevant tests/checks for that phase pass, (3) PROJECT_MEMORY.md marks the phase [x] and notes paths touched, (4) only then advance.",
      description: "Do not mark a phase complete on partial work",
    },
    {
      instruction:
        "Only pause and ask the user when blocked: missing secrets/credentials, irreversible destructive action, genuine product ambiguity with multiple valid choices, or doom-loop (no progress in 3 iterations).",
      description: "Avoid chatty stop-and-ask for routine next steps",
    },
    {
      instruction: "Always read files before editing them",
      description: "Never edit blind — understand the current state first",
    },
    {
      instruction: "Run tests after every substantive change; do not mark a phase complete until checks for that phase pass",
      description: "Verify correctness before advancing",
    },
    {
      instruction: "Run linter and type checker after edits when the project defines them",
      description: "Catch errors early",
    },
    {
      instruction:
        "Keep PROJECT_MEMORY.md updated as you go (Current phase, Done, In progress, Blocked). Editor chat memory does not travel with the repo.",
      description: "Portable continuity across machines and sessions",
    },
    {
      instruction:
        "Tool boundary: folders/files used only to generate AGENTS.md (e.g. a nested uagent / Universal_Loop_Agent toolkit) are NOT part of the product. Do not import them, do not list them as product modules in Index.md, do not couple build scripts to them. Product-owned artifacts are PROJECT_MEMORY.md, AGENTS.md, universal-agent.yaml, .uagent/memory stubs, and optional idea.md / LOOP_START_PROMPT.txt.",
      description: "uagent is a portable tool; the developed project must stand alone",
    },
    {
      instruction:
        "After every substantive delivery, sync project docs that the product owns (Index.md, plan, README) for structure/behavior changes — not the toolkit folder.",
      description: "Documentation stays with the product",
    },
    {
      instruction: "Explain what you changed and why at phase boundaries and at final completion",
      description: "Clear progress reporting without requiring the user to drive the loop",
    },
  ]
}

/** Short activation blurb embedded in generated AGENTS.md */
export function loopActivationLines(): string[] {
  return [
    "### How to activate",
    "",
    "- **Loop mode:** Load / attach this `AGENTS.md` in your AI editor or chat (Cursor, Claude Code, OpenCode, Copilot, Windsurf, etc.), then paste the start prompt (see below or `LOOP_START_PROMPT.txt`).",
    "- **Prompt mode:** Work without loading this file — no loop behavior activates.",
    "- **Memory duo:** `AGENTS.md` = loop rules in-chat; `PROJECT_MEMORY.md` = durable portable handoff on disk. Use both.",
    "",
    "### Suggested start prompt (copy-paste)",
    "",
    `> ${loopStartPrompt()}`,
    "",
    "### Autonomous phased delivery",
    "",
    "1. Read `PROJECT_MEMORY.md` + plan/idea (files or chat).",
    "2. Derive an ordered phase list if the plan is not already phased.",
    "3. For each phase: implement → test → mark done in `PROJECT_MEMORY.md` → next phase.",
    "4. **Definition of Done per phase:** code + checks pass + memory checkbox `[x]` + brief note of paths.",
    "5. **Resume:** if the chat restarted, continue from the first unchecked phase — do not redo completed ones.",
    "6. Stop only when the plan is complete, or when blocked (secrets / irreversible / ambiguity / doom-loop).",
    "7. Do **not** ask the user to say \"continue\" between successful phases.",
    "",
    "### Tool vs product",
    "",
    "- **Product (belongs in the project):** `PROJECT_MEMORY.md`, `AGENTS.md`, `universal-agent.yaml`, `.uagent/memory/`, optional `idea.md` / `LOOP_START_PROMPT.txt`.",
    "- **Toolkit (optional helper, not product code):** any nested generator folder used only to create/update those files. Never treat it as an application module.",
  ]
}
