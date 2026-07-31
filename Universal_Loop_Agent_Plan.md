# Universal_Loop_Agent — Master plan

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
