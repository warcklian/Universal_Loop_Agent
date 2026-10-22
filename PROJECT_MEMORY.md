# Project memory (canonical)

**Single source of truth** for handoff across sessions, teams, and AI tools.
Travels with the repository (any folder or drive). Does not replace the master plan or ops docs.

| Related | Role |
|---------|------|
| `AGENTS.md` | Agent / loop rules; must read and update **this** file |
| `CHANGE_CONTROL.md` | Local change register — row before code, docs before implementing |
| `.uagent/memory/` | Stubs that point here (multi-agent / uagent) |
| `Universal_Loop_Agent_Plan.md` | Master delivery plan |
| `Index.md` | Repository navigation map |

**Project:** Universal Loop Agent (`uagent`)

**Stack:** Languages: typescript · Runtime: bun · Package managers: bun

**Last updated:** 2026-10-21

---

## Permanent policies

- **File lifecycle:** create if missing → update features in place → rename legacy names → **never delete**. Do not use `upgrade --prune` in setup-all or normal flows. Existing `## Phases` checklists are left alone on re-run (`plan-from --force` only when intentional). Canon: `docs/file-lifecycle.md`.
- **Multi-agent:** locks in `.uagent/locks/` (TTL 30 min, gitignored) + `## Active claims

_Live phase reservations for multi-agent coordination. Stale rows (past TTL without heartbeat) may be taken by another agent after `uagent coord:cleanup`._

| Phase | Agent ID | Agent | Claimed at | Heartbeat | Files |
|-------|----------|-------|------------|-----------|-------|
| — | — | — | — | — | — |

## Phases

_Ordered delivery checklist. Mark done only after implement + tests._

- [x] Post-review fixes, English naming, adaptive upgrade
- [x] Autonomous loop + memory duo (rules, README, tool boundary)
- [x] Portable competitive features (adapters, frontmatter, adopt, plan-from, doctor)
- [x] Light deep detect (README + src layout + scripts, no new deps)
- [x] setup-all.bat as sole Windows entry for all users (init+upgrade+plan-from+generate+doctor)
- [x] UX polish: README 3 steps, idea template, start prompt, DoD/resume, doctor tips
- [x] Post-review defect fixes (legacy memory migrate, plan-from paths, phases regex, adopt, dry-run)
- [x] Consumer-run hardening (skip nested toolkit, keep Indice.md, skip empty idea template, console UTF-8)
- [x] plan-from ignores Constraints/Notes body (only Must have / Nice to have / custom ##)
- [x] Local change control canon: CHANGE_CONTROL.md register + docs-before-code gate in every generated project
- [x] English-only filenames and instructions + toolkit self-update (uagent update, setup-all step 0b)
- [x] BOM-tolerant file readers (package.json / YAML / README created by PowerShell or Notepad)
- [x] Port local hardening into DEV: commands/verify/reconcile, MANDATED_RULES, upgrade safety, host coexistence (no max_file_lines)
- [x] File lifecycle canon documented + prune gated (create/update/rename — never delete)
- [x] Multi-agent locks + memory claims (coord:* CLI, mandatory AGENTS rules, TTL 30 min)
- [x] setup-all safety: plan-from preserves existing ## Phases (CH-0005)
- [x] Retire LOOP_START_PROMPT.txt — load AGENTS.md only (CH-0006)
- [ ] Public npm packaging (optional)

## Open items

- Public npm packaging (currently `private: true`)
- Multi-agent file-locking runtime (still documentary)
- e2e/coverage suites if those scripts are published in YAML

## Recent status

CH-0006: `LOOP_START_PROMPT.txt` retired — load `AGENTS.md` activates the loop; generate/upgrade remove the obsolete file; adapters remain create-if-missing.

CH-0005: `plan-from` / setup-all no longer replace an existing `## Phases` checklist (keeps `[x]`); `--force` only when intentional. Audit: init/YAML/memory/CHANGE_CONTROL/idea create-if-missing; upgrade no prune; AGENTS regenerates from YAML only.

Multi-agent coordination: `src/coordination.ts` + `coord:*` CLI; locks under `.uagent/locks/`; phase claims in this file; mandatory rules in AGENTS. Docs: `docs/multi-agent-coordination.md`.

Documented permanent file lifecycle (`docs/file-lifecycle.md`): create / update / rename only; `--prune` ignored unless `--i-accept-deletes`; setup-all never prunes. Reinforced in README, commands.ts, CLI help, and PROJECT_MEMORY permanent policies.

Ported local-hardening handoff onto `feat/port-local-hardening` (base `origin/main`): `commands.ts` + `verify` + `reconcile`, mandated autonomy contract composed with change-control, doctor recognises `*_Plan.md`, upgrade skips toolkit root / nested toolkit / exclude_paths / frozen dirs / host `*.stamp` and keeps diary history. Conserved GitHub change-control, `uagent update`, fs-util BOM. Excluded max_file_lines / file_size on purpose. 55 tests pass; `verify .` OK; typecheck clean.

Change control is now canon: `uagent init` seeds `CHANGE_CONTROL.md` at the project root, `generate` renders a **Change Control** section (register before code, document in detail before implementing, close only when verified), and the loop rules, adapters, start prompt and doctor all reference it. Pre-existing defects fixed along the way: canonical memory was written as `MEMORIA_PROYECTO.md` while the rest expected `PROJECT_MEMORY.md`, `detector` always emitted `npm` commands and had no description/layout scan, and generated `AGENTS.md` lacked frontmatter. 33 tests pass, `tsc --noEmit` clean.
English-only canon: the change register was renamed `CONTROL_CAMBIOS.md` → `CHANGE_CONTROL.md` (with upgrade migrations for existing projects), register states and the seeded register text are English, and the toolkit now self-updates: `uagent update` runs `git fetch` + `merge --ff-only` only, wired into setup-all as step 0b. Offline, dirty, diverged or detached cases are reported and never forced. 40 tests pass.
BOM tolerance: `package.json`, `universal-agent.yaml`, README and the memory index are now read through `src/fs-util.ts`, which strips a leading UTF-8 BOM, so files created with PowerShell redirection or older Notepad no longer read as "unreadable" and their scripts are detected again. 47 tests pass.
CH-0004 (verified): Adaptive autonomous loop agent (ULA). `AGENTS.md` renders in Spanish with 8 improved points: universal across LLM editors, adaptive to the project, plan-driven phased delivery with closed-phase review (functional evidence, not just validated), autonomous research with investigator marking + cross-validation, context preservation when running .bat (never replace blindly; update only if content changed; create if missing), parallel multi-agent orchestration coordinated through `PROJECT_MEMORY.md` (no extra orchestrator files). Start prompt activates automatically on `AGENTS.md` load — no manual copy-paste needed. Explicit rule: read chat history and previous comments before acting. `.bat` entry points (`init.bat`, `setup-all.bat`, `generate.bat`) only update files if content changed; they never replace existing `AGENTS.md`, `PROJECT_MEMORY.md`, `CHANGE_CONTROL.md`, `idea.md` or `plan.md`. `universal-agent.yaml`, `src/schema.ts`, `src/sections/index.ts`, `src/generator.ts`, `src/cli.ts`, `src/plan-from.ts`, `src/loop-defaults.ts`, `src/loop-defaults.test.ts`, `setup-all.bat`, `generate.bat` touched; `bun test` 47/47, `bun run typecheck` OK, doctor 12/12.
Copy updated toolkit into ComfyUI and re-run setup-all to refresh PROJECT_MEMORY phases.
