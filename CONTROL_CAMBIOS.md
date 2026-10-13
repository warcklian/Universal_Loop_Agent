# Control de cambios (local)

Registro local de cambios del proyecto. Vive en la raíz y viaja con el repositorio.
Complementa `PROJECT_MEMORY.md` (fases / handoff) e `Index.md` (navegación):
aquí se anota qué cambió, por qué y cómo se verificó.

**Regla canon** (ver `AGENTS.md` → *Change Control*): ningún cambio de código sin una fila
aquí, y la documentación se actualiza **antes** de implementar.

## Cómo usarlo

1. **Antes de programar** — agrega una fila con estado `autorizado`.
2. **Antes de implementar** — actualiza la documentación en detalle: qué y por qué, archivos
   afectados, pasos, criterios de aceptación y cómo verificar. Debe bastar para que cualquier
   agente lo desarrolle solo con el repositorio.
3. **Al terminar** — marca `implementado` → `verificado` y anota archivos y verificación.

## Estados

`autorizado` → `en curso` → `implementado` → `verificado` (`bloqueado` si hay impedimento).

## Registro

| ID | Fecha | Alcance | Estado | Archivos | Verificación |
|----|-------|---------|--------|----------|--------------|
| CH-0001 | 2026-10-13 | Control de cambios local + gate de documentación previa: `CONTROL_CAMBIOS.md` en cada proyecto generado, sección Change Control en `AGENTS.md`, regla de loop, doctor, `change_control` en YAML. Incluye correcciones preexistentes (memoria canónica, comandos del detector, frontmatter). | implementado | `src/change-control.ts`, `src/schema.ts`, `src/parser.ts`, `src/generator.ts`, `src/sections/index.ts`, `src/loop-defaults.ts`, `src/memory.ts`, `src/yaml-generator.ts`, `src/detector.ts`, `src/doctor.ts`, `src/cli.ts`, `src/adapters.ts`, `src/idea-template.ts`, `setup-all.bat`, `setup-all.ps1`, `universal-agent.yaml`, `README.md`, `Index.md`, `PROJECT_MEMORY.md`, `Universal_Loop_Agent_Plan.md`, `.cursorrules`, `CLAUDE.md`, `.github/copilot-instructions.md`, `templates/idea.md` | `bun test` 33/33 · `bun run typecheck` OK · `uagent generate` regenera AGENTS.md con la sección |

_El ID es secuencial y nunca se reutiliza._
