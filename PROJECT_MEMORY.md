# Project memory (canonical)

**Single source of truth** for handoff across sessions, teams, and AI tools.
Travels with the repository (any folder or drive). Does not replace the master plan or ops docs.

| Related | Role |
|---------|------|
| `AGENTS.md` | Agent / loop rules; must read and update **this** file |
| `CONTROL_CAMBIOS.md` | Local change register — row before code, docs before implementing |
| `.uagent/memory/` | Stubs that point here (multi-agent / uagent) |
| `Universal_Loop_Agent_Plan.md` | Master delivery plan |
| `Index.md` | Repository navigation map |

**Project:** Universal Loop Agent (`uagent`)

**Stack:** Languages: typescript · Runtime: bun · Package managers: bun

**Last updated:** 2026-10-13

---

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
- [x] Local change control canon: CONTROL_CAMBIOS.md register + docs-before-code gate in every generated project
- [ ] Public npm packaging (optional)

## Open items

- Public npm packaging (currently `private: true`)
- Multi-agent file-locking runtime (still documentary)
- e2e/coverage suites if those scripts are published in YAML

## Recent status

Change control is now canon: `uagent init` seeds `CONTROL_CAMBIOS.md` at the project root, `generate` renders a **Change Control** section (register before code, document in detail before implementing, close only when verified), and the loop rules, adapters, start prompt and doctor all reference it. Pre-existing defects fixed along the way: canonical memory was written as `MEMORIA_PROYECTO.md` while the rest expected `PROJECT_MEMORY.md`, `detector` always emitted `npm` commands and had no description/layout scan, and generated `AGENTS.md` lacked frontmatter. 33 tests pass, `tsc --noEmit` clean.
Copy updated toolkit into ComfyUI and re-run setup-all to refresh PROJECT_MEMORY phases.
