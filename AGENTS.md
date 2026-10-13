---
description: "Universal agent config generator — auto-adapts to any project stack"
tags:
  - typescript
  - bun
---
# Universal Loop Agent

Universal agent config generator — auto-adapts to any project stack

**Languages:** typescript
**Runtime:** bun
**Package Managers:** bun

## Build & Run

- **Install dependencies:** `bun install`
- **Start dev server:** `bun run dev`
- **Build for production:** `bun run build`
- **Lint:** `bun run lint`
- **Type check:** `bun run typecheck`

## Testing

- **Unit tests:** `bun test`
- **E2E tests:** `bun test:e2e`
- **Coverage:** `bun test:coverage`

## Code Style

- Indentation: 2 spaces
- Quotes: double
- Semicolons: yes
- Max line length: 100

Conventions:
- Use TypeScript strict mode
- Prefer functional patterns over classes
- Keep functions small and focused
- Use descriptive variable and function names

## Security

- Never commit secrets or API keys
- Validate all user input
- Use environment variables for configuration

## Git Conventions

- **Commit format:** conventional
- **Branch format:** `{type}/{ticket}-{description}`
- Write meaningful commit messages
- Keep commits atomic and focused

## Change Control (local)

Local change control for every change. No code before a registered row and a documentation update.

- **Register file:** `CHANGE_CONTROL.md` (project root, travels with the repo)
- **ID format:** `CH-0001`, `CH-0002`, … (sequential, never reused)
- **States:** `authorized` → `in progress` → `implemented` → `verified`

### Rules

1. **Register before coding** — every authorized change starts as a row in `CHANGE_CONTROL.md` with ID, date, scope and status `authorized`. No row, no code.
2. **Document before implementing** — before writing code, update the documentation in detail so any agent with only the repository (no chat history) can develop it: what and why, files/modules affected, exact steps, acceptance criteria and how to verify.
3. **Docs are the spec** — the documentation update is part of the change, not an afterthought. When behavior changes, the docs that describe it change in the same delivery.
4. **Close only when verified** — set the row to `implemented` (then `verified`) only after the code is in place, the tests/checks for that change pass, and the docs match the implemented behavior. Record the files touched and the verification used.
5. **Local and portable** — `CHANGE_CONTROL.md` lives at project root and travels with the repo; it is the change history that complements `PROJECT_MEMORY.md` (phases/handoff) and `Index.md` (navigation).

## Agent Loop

This section defines how the agent loop behaves. Load this file to activate loop mode.

- **Max iterations:** 15
- **Timeout:** 300s
- **Doom loop detection:** enabled — stops if no progress in 3 iterations

### Loop Rules

- Change control gate: before implementing any authorized change, add a row to CHANGE_CONTROL.md (ID, date, scope, status authorized) and update the documentation in detail so any agent can develop it from the repo alone. No row and no docs update, no code.
- Always read files before editing them
- Run tests after every change
- Run linter and type checker after edits
- If no progress in 3 iterations, stop and ask the user
- Explain what you changed and why

### How to activate

- **Loop mode:** Load / attach this `AGENTS.md` in your AI editor or chat (Cursor, Claude Code, OpenCode, Copilot, Windsurf, etc.), then paste the start prompt (see below or `LOOP_START_PROMPT.txt`).
- **Prompt mode:** Work without loading this file — no loop behavior activates.
- **Memory duo:** `AGENTS.md` = loop rules in-chat; `PROJECT_MEMORY.md` = durable portable handoff on disk. Use both.
- **Change control:** `CHANGE_CONTROL.md` = local register of every change (row before code, docs before implementation).

### Suggested start prompt (copy-paste)

> Load AGENTS.md (loop mode). Read PROJECT_MEMORY.md, CHANGE_CONTROL.md and idea.md (or the plan). Implement the project phase by phase until all phases are done. For each phase: implement → run tests/checks → mark the phase done in PROJECT_MEMORY.md → continue to the next phase. Change control: before implementing an authorized change, add its row to CHANGE_CONTROL.md and update the documentation in detail. Do not ask me to say continue between successful phases. Only stop if blocked (secrets, irreversible action, real ambiguity, or doom-loop). If this chat is a resume: do not redo completed phases; continue from the first unchecked phase in PROJECT_MEMORY.md.

### Autonomous phased delivery

1. Read `PROJECT_MEMORY.md` + plan/idea (files or chat).
2. Derive an ordered phase list if the plan is not already phased.
3. For each phase: implement → test → mark done in `PROJECT_MEMORY.md` → next phase.
4. **Definition of Done per phase:** code + checks pass + memory checkbox `[x]` + brief note of paths.
5. **Resume:** if the chat restarted, continue from the first unchecked phase — do not redo completed ones.
6. Stop only when the plan is complete, or when blocked (secrets / irreversible / ambiguity / doom-loop).
7. Do **not** ask the user to say "continue" between successful phases.

### Tool vs product

- **Product (belongs in the project):** `PROJECT_MEMORY.md`, `AGENTS.md`, `universal-agent.yaml`, `.uagent/memory/`, optional `idea.md` / `LOOP_START_PROMPT.txt`.
- **Toolkit (optional helper, not product code):** any nested generator folder used only to create/update those files. Never treat it as an application module.

## Multi-Agent Coordination

### Shared Memory

- **Enabled:** yes
- **Canonical handoff (read/update):** `PROJECT_MEMORY.md` at project root — portable across machines
- **uagent stubs path:** `.uagent/memory/` (pointers only; do not duplicate the diary there)
- **Auto-sync:** enabled — keep `PROJECT_MEMORY.md` (canonical) up to date after substantive work

At the start of substantive work, read the canonical memory file. After finishing a delivery, update it (date, open items, short summary). Editor-local memory does not travel with the repo.

### Ownership Matrix

Each agent is responsible for specific file domains. Do not edit files outside your domain.

- **core:** `src/schema.ts`, `src/parser.ts`, `src/generator.ts`, `src/cli.ts`, `src/detector.ts`
- **sections (integrator — runs last):** `src/sections/**`

### Conflict Prevention

- **File locking:** enabled — lock files before editing
- **Auto-detect collisions:** enabled — warn on concurrent edits
- **Merge strategy:** topological

## Project-Specific Rules

### Schema Types

**Applies to:** `src/schema.ts`

Single source of truth for all types.
All other files must import from here.
Never duplicate type definitions.

### Section Generators

**Applies to:** `src/sections/**`

Each section function returns string | null.
Return null if the section has no content.
Never return empty strings.

### Generator

**Applies to:** `src/generator.ts`

Orchestrates all sections into a single AGENTS.md.
Sections are joined with double newlines.
Never modify the output format — consumers depend on it.


## Additional Instructions

Universal agent config generator — auto-adapts to any project stack.
Edit universal-agent.yaml to configure everything.
Run `uagent generate` to regenerate.
Load AGENTS.md in your agent to activate loop mode.
Work without the file for normal prompt mode.
