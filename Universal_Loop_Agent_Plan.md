# Universal_Loop_Agent — Master plan

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
