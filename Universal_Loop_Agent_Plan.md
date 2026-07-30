# Universal_Loop_Agent — Plan maestro

## Registro — 2026-07-29

| Campo | Valor |
|-------|--------|
| **Tema** | Correcciones post-revisión (init, detector, wrappers, YAML, docs) |
| **Objetivo** | Cerrar inconsistencias entre CLI, scripts Windows, YAML propio y documentación |
| **Alcance** | `src/cli.ts`, `src/detector.ts`, wrappers bat/ps1, `universal-agent.yaml`, README, `Indice.md` |
| **Estado** | Completado 2026-07-29 |

### Pasos

1. Implementar `--force` real en `uagent init` (sobrescribir YAML).
2. Detector: comandos de build según package manager detectado (bun/npm/yarn/pnpm).
3. Alinear `generate.ps1` con `generate.bat` (`-o .. --force`).
4. Actualizar `universal-agent.yaml` del repo: `canonical_file`, reglas MEMORIA, ownership de módulos nuevos; quitar scripts de test inexistentes.
5. Actualizar README (comandos reales, memoria canónica, `detect`, flags).
6. Crear `Indice.md` con árbol del repositorio.
7. Regenerar `AGENTS.md` y verificar validate / typecheck / test.

### Fuera de alcance (esta entrega)

- Empaquetado npm público (`private: true` se mantiene).
- Suite E2E / coverage reales.
- Runtime de file-locking multi-agente (sigue siendo documental).
