# Memoria del proyecto (canónica)

**Fuente única** de handoff entre sesiones, equipos e IAs. Viaja con el repositorio
(cualquier carpeta o unidad). No sustituye el plan maestro ni la documentación operativa.

| Relacionado | Rol |
|-------------|-----|
| `AGENTS.md` | Reglas del agente / loop; debe leer y actualizar **este** archivo |
| `.uagent/memory/` | Stubs que apuntan aquí (multi-agente / uagent) |
| `Universal_Loop_Agent_Plan.md` | Plan maestro de entregas |
| `Indice.md` | Mapa de navegación del repo |

**Proyecto:** Universal Loop Agent (`uagent`)

**Stack:** Languages: typescript · Runtime: bun · Package managers: bun

**Última actualización:** 2026-07-29

---

## Pendientes

- Empaquetado público npm (hoy `private: true`)
- Runtime de file-locking multi-agente (sigue documental)
- Suites e2e/coverage si se publican scripts en el YAML

## Estado reciente

Correcciones post-revisión: `--force` en `init`, comandos de build según package manager
detectado, `generate.ps1` alineado con bat, YAML con `canonical_file` + ownership completo,
README/Indice/plan, tests de detector/parse/generateYaml.
