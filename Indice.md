# Índice — Universal Loop Agent (`uagent`)

| Campo | Valor |
|-------|--------|
| **Stack** | TypeScript, Bun, Commander, yaml |
| **Arranque** | `bun install` → `bun run src/cli.ts …` o `init.bat` / `generate.bat` |
| **Plan maestro** | `Universal_Loop_Agent_Plan.md` |
| **Contrato agente** | `universal-agent.yaml` → `AGENTS.md` |

## Árbol del repositorio

```
Universal_Loop_Agent/
├── Universal_Loop_Agent_Plan.md — plan maestro (registro de entregas)
├── Indice.md — este mapa de navegación
├── MEMORIA_PROYECTO.md — handoff canónico entre sesiones
├── .cursorrules — contrato operativo local de Cursor
├── README.md — uso rápido, CLI y memoria portable
├── package.json — bin uagent, scripts bun (dev/build/test/lint/typecheck)
├── bun.lock — lockfile Bun
├── tsconfig.json — TypeScript strict / bundler
├── universal-agent.yaml — config fuente de este repo (genera AGENTS.md)
├── AGENTS.md — salida generada (gitignore; reglas de loop)
├── .gitignore — node_modules, dist, AGENTS.md, .uagent/memory/
├── init.bat — init Windows CMD hacia el proyecto padre
├── init.ps1 — init Windows PowerShell hacia el padre
├── generate.bat — generate AGENTS.md en el padre (--force)
├── generate.ps1 — generate AGENTS.md en el padre (--force)
└── src/
    ├── cli.ts — comandos init / detect / generate / validate
    ├── schema.ts — tipos SourceConfig (única fuente de tipos)
    ├── parser.ts — lee y valida YAML → SourceConfig
    ├── generator.ts — orquesta secciones → AGENTS.md
    ├── detector.ts — detección heurística de stack del proyecto destino
    ├── detector.test.ts — tests de detección, parse y generateYaml
    ├── memory.ts — MEMORIA_PROYECTO.md + stubs .uagent/memory/
    ├── yaml-generator.ts — escribe universal-agent.yaml desde DetectedProject
    └── sections/
        └── index.ts — generadores markdown por sección (string | null)
```

## Puntos de entrada

| Entrada | Ruta |
|---------|------|
| CLI | `src/cli.ts` |
| Generación MD | `src/generator.ts` + `src/sections/index.ts` |
| Init / detección | `src/detector.ts` → `src/yaml-generator.ts` + `src/memory.ts` |
| Wrappers Windows | `init.bat`, `init.ps1`, `generate.bat`, `generate.ps1` |
| Tests | `bun test` (`src/detector.test.ts`) |

## Última revisión

- **Fecha:** 2026-07-29
- **Alcance:** correcciones init `--force`, detector por package manager, wrappers alineados, YAML/README/índice

## Pendiente de profundizar

- Empaquetado público npm (hoy `private: true`)
- Runtime real de file-locking multi-agente (hoy documental en AGENTS.md)
