# Change control (local)

Local register of project changes. Lives at the project root and travels with the repository.
It complements `PROJECT_MEMORY.md` (phases / handoff) and `Index.md` (navigation):
here you record what changed, why, and how it was verified.

**Canon rule** (see `AGENTS.md` → *Change Control*): no code change without a row here,
and the documentation is updated **before** implementing.

## How to use it

1. **Before coding** — add a row with status `authorized`.
2. **Before implementing** — update the documentation in detail: what and why, files
   affected, steps, acceptance criteria, and how to verify. It must be enough for any
   agent to develop it from the repository alone.
3. **When done** — mark `implemented` → `verified` and record files and verification.

## States

`authorized` → `in progress` → `implemented` → `verified` (`blocked` if there is an impediment).

## Register

| ID | Date | Scope | State | Files | Verification |
|----|------|-------|-------|-------|--------------|
| CH-0001 | 2026-10-13 | Local change control canon + documentation gate: `CHANGE_CONTROL.md` register in every generated project, Change Control section in `AGENTS.md`, loop gate rule, doctor check, `change_control` YAML block, self-update check. Includes pre-existing fixes (canonical memory, detector commands, frontmatter). | implemented | `src/change-control.ts`, `src/schema.ts`, `src/parser.ts`, `src/generator.ts`, `src/sections/index.ts`, `src/loop-defaults.ts`, `src/memory.ts`, `src/yaml-generator.ts`, `src/detector.ts`, `src/doctor.ts`, `src/cli.ts`, `src/adapters.ts`, `src/idea-template.ts`, `src/upgrade.ts`, `setup-all.bat`, `setup-all.ps1`, `universal-agent.yaml`, `README.md`, `Index.md`, `PROJECT_MEMORY.md`, `Universal_Loop_Agent_Plan.md`, `.cursorrules`, `CLAUDE.md`, `.github/copilot-instructions.md`, `templates/idea.md` | `bun test` all pass · `bun run typecheck` OK · `uagent generate` regenerates AGENTS.md with the section |

_The ID is sequential and never reused._

| CH-0003 | 2026-10-13 | BOM-tolerant readers: `package.json`, `universal-agent.yaml`, README and the memory index are read through the new `fs-util.ts`, which strips a leading UTF-8 BOM. Files created with PowerShell redirection or older Notepad no longer read as "unreadable" and their scripts/detection work again. | implemented | `src/fs-util.ts`, `src/fs-util.test.ts`, `src/detector.ts`, `src/doctor.ts`, `src/parser.ts`, `src/memory.ts`, `src/plan-from.ts`, `src/adopt.ts`, `src/idea-template.ts`, `Index.md`, `PROJECT_MEMORY.md` | `bun test` 47/47 · `bun run typecheck` OK · e2e con `package.json` + BOM: doctor OK, init detecta nombre y scripts |

| CH-0002 | 2026-10-13 | English-only canon (rename `CONTROL_CAMBIOS.md` → `CHANGE_CONTROL.md`, English states and register text) + toolkit self-update (`uagent update`, fast-forward only, setup-all step 0b). | implemented | `src/change-control.ts`, `src/self-update.ts`, `src/self-update.test.ts`, `src/change-control.test.ts`, `src/upgrade.ts`, `src/idea-template.ts`, `src/loop-defaults.ts`, `setup-all.bat`, `setup-all.ps1`, `README.md`, `Index.md`, `PROJECT_MEMORY.md`, `Universal_Loop_Agent_Plan.md`, `.cursorrules`, `CLAUDE.md`, `.github/copilot-instructions.md`, `templates/idea.md`, `universal-agent.yaml` | `bun test` 40/40 · `bun run typecheck` OK · `uagent update --check` reports status · local origin/clone scenarios verified |
