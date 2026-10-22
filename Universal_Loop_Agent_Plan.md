# Universal_Loop_Agent — Master plan

## Record — 2026-10-21 (Retire LOOP_START_PROMPT.txt)

| Field | Value |
|-------|--------|
| **Topic** | Activation is load-AGENTS.md only; no separate start-prompt file |
| **Goal** | Do not create `LOOP_START_PROMPT.txt`; remove it when regenerating `AGENTS.md`; adapters remain |
| **Status** | Completed (CH-0006) |

### Spec

- **What / why:** CH-0004 already stated the loop activates on loading `AGENTS.md` with no paste. The leftover file and setup-all/write-prompt path contradicted that and could confuse consumers.
- **Files:** `idea-template.ts` (remove helper), `cli.ts` generate + write-prompt, `loop-defaults.ts` activation copy, setup-all, docs/README/Index, tests, delete root `LOOP_START_PROMPT.txt`.
- **Steps:**
  1. Replace `writeStartPromptFile` with `removeObsoleteStartPromptFile` (unlink if present).
  2. Call it from `generate` whenever `AGENTS.md` is written or already present/unchanged.
  3. `write-prompt` CLI becomes a cleanup alias (removes the file; does not create).
  4. setup-all: drop write-prompt step; UX = load AGENTS.md only.
  5. Activation section: no “Suggested start prompt” / no LOOP_START_PROMPT references.
- **Acceptance:** Fresh setup and re-generate leave no `LOOP_START_PROMPT.txt`; adapters still create-if-missing; suite green.
- **Verify:** `bun test` · `bun run typecheck` · `uagent generate` on this repo.

---

## Record — 2026-10-21 (setup-all: preserve existing phases)

| Field | Value |
|-------|--------|
| **Topic** | Safety when re-running setup-all on a product that already has a previous ULA |
| **Goal** | Never delete or corrupt handoff: `plan-from` must not replace an existing `## Phases` checklist (including checked items) unless the user passes `--force` |
| **Status** | Completed (CH-0005 verified) |

### Spec

- **What / why:** Re-running `setup-all` on a parent project that already has `PROJECT_MEMORY.md` with phases was rewriting `## Phases` from `idea.md` / `*_Plan.md`, wiping `[x]` progress and custom phase lists.
- **Files:** `src/plan-from.ts`, `src/cli.ts`, `src/features.test.ts`, `docs/file-lifecycle.md`, setup-all footer copy, plan / CHANGE_CONTROL / PROJECT_MEMORY.
- **Steps:**
  1. Detect an existing phase checklist under `## Phases` (`- [ ]` / `- [x]` with text).
  2. Default: skip write; leave memory unchanged; message explains how to force.
  3. CLI `plan-from --force` (and `planFromIdea(..., { force: true })`) for explicit refresh.
  4. setup-all continues to call plan-from **without** `--force`.
- **Acceptance:** Existing checklist preserved on second plan-from; empty memory still gets phases from a filled idea; suite + typecheck green.
- **Verify:** `bun test` (plan-from cases) · `bun run typecheck`.

---

## Record — 2026-10-21 (Multi-agent locks + claims)

| Field | Value |
|-------|--------|
| **Topic** | Hybrid coordination: `.uagent/locks` TTL + Active claims in PROJECT_MEMORY |
| **Goal** | Several agents, same prompt; free phases only; no marking another's live phase done |
| **Status** | Completed |

### Delivered

- `src/coordination.ts` + `coord:*` CLI + tests
- Mandatory coord rules in `MANDATED_RULES` / AGENTS Multi-Agent section
- Docs `docs/multi-agent-coordination.md`; locks gitignored; claims versioned in memory
- Default TTL 30 minutes with heartbeat

---

## Record — 2026-10-21 (File lifecycle: never prune / never delete)

| Field | Value |
|-------|--------|
| **Topic** | Permanent create / update / rename policy; stop regressing `--prune` deletes |
| **Goal** | Document and enforce: missing→create, exists→update features, legacy name→rename only; never auto-delete |
| **Status** | Completed |

### Delivered

- `docs/file-lifecycle.md` as the canon policy
- README + `PROJECT_MEMORY.md` permanent policies + setup-all footer
- `--prune` deprecated: ignored unless `--i-accept-deletes`
- `setup-all` never passes `--prune`
- Tests: default keeps both names; deletes only with explicit `allowDeletes`

---

## Record — 2026-10-13 (BOM-tolerant file readers)

| Field | Value |
|-------|--------|
| **Topic** | Files saved with a UTF-8 BOM (PowerShell redirection, older Notepad) read as unreadable |
| **Goal** | Detection, doctor and parser must not fail on Windows-created files |
| **Status** | Completed |

### Delivered

- New `src/fs-util.ts`: `readTextFile` / `readJsonFile` strip a leading BOM
- `package.json`, `universal-agent.yaml`, README and the memory index now read through it
- Regression tests for the reader plus a consumer project with a BOM'd `package.json`
- 47 tests in green, `tsc --noEmit` clean

---


## Record — 2026-10-13 (Local change control + docs gate)

| Field | Value |
|-------|--------|
| **Topic** | Local change control + mandatory documentation before implementing |
| **Goal** | Every generated project registers the change and documents it in detail **before** coding |
| **Status** | Completed |

### Delivered
- `CHANGE_CONTROL.md` as the canonical register at the project root (created by `init`, never overwritten)
- **Change Control (local)** section in the generated `AGENTS.md`: register before coding, document in detail before implementing, close only once verified
- Gate rule in `agent_loop` + line in `CLAUDE.md`, `copilot-instructions`, `.cursorrules` and `LOOP_START_PROMPT.txt`
- `doctor` scores the presence of the register (`change_control`)
- Config `change_control.enabled / file / id_prefix / rules` parsed and seeded by `yaml-generator`
- Pre-existing defects fixed: canonical memory (`PROJECT_MEMORY.md`), detector commands based on lockfile, description/layout, `AGENTS.md` frontmatter
- 40 tests in green, `tsc --noEmit` clean
- 33 tests en verde, `tsc --noEmit` limpio

## Record — 2026-10-13 (English-only canon + toolkit self-update)

| Field | Value |
|-------|--------|
| **Topic** | English filenames/instructions for agent compatibility + automatic version check |
| **Goal** | One language for every generated file; the toolkit self-updates when the remote is ahead |
| **Status** | Completed |

### Delivered

- `CONTROL_CAMBIOS.md` renamed to `CHANGE_CONTROL.md`, with upgrade migrations for existing projects
- Register states now English (`authorized` / `in progress` / `implemented` / `verified`)
- New `self-update.ts` + `uagent update`: `git fetch` then `merge --ff-only` only, never rewrites history
- setup-all runs the update check as step 0b; offline / dirty / diverged / detached cases are reported, never forced
- 40 tests in green, `tsc --noEmit` clean

---

---

## Registro — 2026-07-30 (plan-from Constraints/Notes)

| Field | Value |
|-------|--------|
| **Topic** | No tratar Constraints/Notes como fases |
| **Goal** | plan-from solo usa Must have / Nice to have / ## custom |
| **Scope** | `plan-from.ts`, `templates/idea.md`, tests |
| **Status** | Completed |

### Entregado

- Cuerpo de Goal / Constraints / Notes ignorado al derivar fases
- Filtro extra para filas Stack / Do not use / Deadline
- Plantilla documenta que Constraints/Notes no son fases

---

## Registro — 2026-07-30 (setup-all on nested ComfyUI)

| Field | Value |
|-------|--------|
| **Topic** | Hardening after first consumer run (ComfyUI_windows_portable) |
| **Goal** | No tocar toolkit anidado; no renombrar Indice del producto; no inventar fases desde plantilla; encoding consola |
| **Scope** | `upgrade.ts`, `plan-from.ts`, `cli.ts`, `setup-all.*`, tests |
| **Status** | Completed |

### Entregado

- `upgrade` omite carpeta `Universal_Loop_Agent` / toolkit anidado
- Ya no migra `Indice.md` → `Index.md` (rompe índices de producto)
- `plan-from` detecta plantilla vacía y no escribe fases falsas
- `setup-all.bat`: `chcp 65001` + guiones ASCII; idea path first-match
- dry-run no anuncia informe escrito

---

## Registro — 2026-07-30 (Post-review fixes)

| Field | Value |
|-------|--------|
| **Topic** | Corregir defectos de setup-all / plan-from / adopt / dry-run |
| **Goal** | No perder memoria legacy, plan-from usable, phases sin corrupción, adopt/dry-run correctos |
| **Scope** | `memory.ts`, `plan-from.ts`, `adopt.ts`, `upgrade.ts`, `setup-all.*`, tests |
| **Status** | Completed |

### Entregado

- `ensureCanonicalMemory` migra `MEMORIA_PROYECTO.md` → `PROJECT_MEMORY.md` antes de seed vacío
- `setup-all` pasa `idea.md` relativo al target (no `../idea.md` → abuelo)
- `upsertPhasesSection` sin ancla `\z` inválida en JS
- `appendAdoptInstructions` evita clave duplicada (`|` / `>` / ausente)
- `upgrade --dry-run` no escribe informe; informe aplica usa `root: "."`

---

## Registro — 2026-07-30 (Licencia MIT completa)

| Field | Value |
|-------|--------|
| **Topic** | Completar licencia MIT en el repositorio |
| **Goal** | Que no falte LICENSE, campo SPDX en package.json ni referencias coherentes |
| **Scope** | `LICENSE`, `package.json`, `README.md`, `Index.md` |
| **Status** | Completed |

### Entregado

- `LICENSE` con texto MIT completo y copyright 2026
- `package.json`: `license`, `author`, `repository`
- README enlaza a `LICENSE` + resumen de permisos
- `Index.md` incluye `LICENSE` en el árbol

---

## Registro — 2026-07-30 (Auto-install Bun)

| Field | Value |
|-------|--------|
| **Topic** | Auto-install Bun in setup-all |
| **Goal** | If `bun` is missing, run the official Windows installer and continue setup |
| **Scope** | `setup-all.bat`, `setup-all.ps1`, README note |
| **Status** | Completed |

### Entregado

- `setup-all.bat` / `setup-all.ps1` auto-install Bun via `https://bun.sh/install.ps1`
- Session PATH prepends `%USERPROFILE%\.bun\bin`
- README + Index note network requirement on first run

---

## Registro — 2026-07-30 (Polish UX)

| Field | Value |
|-------|--------|
| **Topic** | Polish loop+memory+setup experience |
| **Goal** | Clearer README (3 steps), setup-all copy-paste prompt, idea.md template, stronger phase DoD/resume |
| **Scope** | README, setup-all, templates/idea.md, memory seed, loop-defaults, doctor tips |
| **Status** | Completed |

### Entregado

- README en 3 pasos + sección Advanced CLI
- `templates/idea.md` + `ensure-idea` / `write-prompt`
- setup-all imprime prompt copy-paste + `LOOP_START_PROMPT.txt`
- loop-defaults: resume, DoD por fase, start prompt embebido
- doctor: check `idea` + tips de fix
- Index / ownership / tests actualizados
