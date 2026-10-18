---
description: "Universal agent config generator — auto-adapts to any project stack"
tags:
  - typescript
  - bun
---
# Universal Loop Agent

Universal agent config generator — auto-adapts to any project stack

**Languages:** typescript
**Runtime:** bun
**Package Managers:** bun

## Build & Run

- **Install dependencies:** `bun install`
- **Start dev server:** `bun run dev`
- **Build for production:** `bun run build`
- **Lint:** `bun run lint`
- **Type check:** `bun run typecheck`

## Testing

- **Unit tests:** `bun test`
- **E2E tests:** `bun test:e2e`
- **Coverage:** `bun test:coverage`

## Code Style

- Indentation: 2 spaces
- Quotes: double
- Semicolons: yes
- Max line length: 100

Conventions:
- Use TypeScript strict mode
- Prefer functional patterns over classes
- Keep functions small and focused
- Use descriptive variable and function names

## Security

- Never commit secrets or API keys
- Validate all user input
- Use environment variables for configuration

## Git Conventions

- **Commit format:** conventional
- **Branch format:** `{type}/{ticket}-{description}`
- Write meaningful commit messages
- Keep commits atomic and focused

## Change Control (local)

Local change control for every change. No code before a registered row and a documentation update.

- **Register file:** `CHANGE_CONTROL.md` (project root, travels with the repo)
- **ID format:** `CH-0001`, `CH-0002`, … (sequential, never reused)
- **States:** `authorized` → `in progress` → `implemented` → `verified`

### Rules

1. **Register before coding** — every authorized change starts as a row in `CHANGE_CONTROL.md` with ID, date, scope and status `authorized`. No row, no code.
2. **Document before implementing** — before writing code, update the documentation in detail so any agent with only the repository (no chat history) can develop it: what and why, files/modules affected, exact steps, acceptance criteria and how to verify.
3. **Docs are the spec** — the documentation update is part of the change, not an afterthought. When behavior changes, the docs that describe it change in the same delivery.
4. **Close only when verified** — set the row to `implemented` (then `verified`) only after the code is in place, the tests/checks for that change pass, and the docs match the implemented behavior. Record the files touched and the verification used.
5. **Local and portable** — `CHANGE_CONTROL.md` lives at project root and travels with the repo; it is the change history that complements `PROJECT_MEMORY.md` (phases/handoff) and `Index.md` (navigation).

### Project-Specific Change Rules

- El ID es secuencial y nunca se reusa (CH-0001, CH-0002, …).
- Cierra la fila solo cuando el código está en su lugar, las pruebas pasan y la documentación coincide con el comportamiento implementado (implemented → verified).
- Registra los archivos tocados y la verificación usada.

## Agent Loop

This section defines how the agent loop behaves. Load this file to activate loop mode.

- **Max iterations:** 15
- **Timeout:** 300s
- **Doom loop detection:** enabled — stops if no progress in 3 iterations

### Loop Rules

- Carga AGENTS.md en el chat para activar el modo loop; sin él se trabaja en modo prompt (sin bucle automático).
- Al iniciar la sesión lee PROJECT_MEMORY.md, luego idea.md / plan.md y universal-agent.yaml. El disco es la fuente de verdad y el punto de reanudación.
- Lee el historial del chat y los comentarios previos antes de actuar, para tener todo el contexto de lo ya conversado y no repetir ni omitir nada.
- Nunca edites un archivo sin leerlo primero y entender su estado actual.
- Ejecuta una acción, observa el resultado real y adapta el siguiente paso (ciclo cerrado: actuar → observar → adaptar).
- Si una solución falla, no la repitas indefinidamente: identifica la causa, busca alternativas y elige una prueba que las distinga.
- Tras cada cambio sustancial ejecuta las pruebas, el linter y el type checker del proyecto.
- Si no hay progreso en 3 iteraciones, detente y pregunta al usuario (detección de bucle sin salida).
- No pidas al usuario que diga 'continue' entre fases exitosas; avanza hasta completar la entrega o hasta quedar bloqueado.
- Explica qué cambiaste y por qué al finalizar cada fase y al completar la entrega.
- Registra cada cambio autorizado en CHANGE_CONTROL.md (fila, fecha, alcance, estado authorized) y documenta en detalle antes de escribir código: qué, por qué, archivos, pasos, aceptación y verificación. Sin fila y sin documentación, no hay código.
- Cierra una fase solo cuando: código implementado + pruebas de la fase pasan + PROJECT_MEMORY.md marca la fase [x] con las rutas tocadas.

### How to activate

- **Loop mode:** Load / attach this `AGENTS.md` in your AI editor or chat (Cursor, Claude Code, OpenCode, Copilot, Windsurf, etc.). The loop rules and start prompt activate automatically — no manual copy-paste required.
- **Prompt mode:** Work without loading this file — no loop behavior activates.
- **Memory duo:** `AGENTS.md` = loop rules in-chat; `PROJECT_MEMORY.md` = durable portable handoff on disk. Use both.
- **Change control:** `CHANGE_CONTROL.md` = local register of every change (row before code, docs before implementation).

### Autonomous phased delivery

1. Read `PROJECT_MEMORY.md` + plan/idea (files or chat).
2. Derive an ordered phase list if the plan is not already phased.
3. For each phase: implement → test → mark done in `PROJECT_MEMORY.md` → next phase.
4. **Definition of Done per phase:** code + checks pass + memory checkbox `[x]` + brief note of paths.
5. **Resume:** if the chat restarted, continue from the first unchecked phase — do not redo completed ones.
6. Stop only when the plan is complete, or when blocked (secrets / irreversible / ambiguity / doom-loop).
7. Do **not** ask the user to say "continue" between successful phases.

### Tool vs product

- **Product (belongs in the project):** `PROJECT_MEMORY.md`, `AGENTS.md`, `universal-agent.yaml`, `.uagent/memory/`, optional `idea.md` / `LOOP_START_PROMPT.txt`.
- **Toolkit (optional helper, not product code):** any nested generator folder used only to create/update those files. Never treat it as an application module.

## Multi-Agent Coordination

### Shared Memory

- **Enabled:** yes
- **Canonical handoff (read/update):** `PROJECT_MEMORY.md` at project root — portable across machines
- **uagent stubs path:** `.uagent/memory/` (pointers only; do not duplicate the diary there)
- **Auto-sync:** enabled — keep `PROJECT_MEMORY.md` (canonical) up to date after substantive work

At the start of substantive work, read the canonical memory file. After finishing a delivery, update it (date, open items, short summary). Editor-local memory does not travel with the repo.

### Ownership Matrix

Each agent is responsible for specific file domains. Do not edit files outside your domain.

- **core:** `src/schema.ts`, `src/parser.ts`, `src/generator.ts`, `src/cli.ts`, `src/detector.ts`
- **sections (integrator — runs last):** `src/sections/**`

### Conflict Prevention

- **File locking:** enabled — lock files before editing
- **Auto-detect collisions:** enabled — warn on concurrent edits
- **Merge strategy:** topological

## Project-Specific Rules

### Schema Types

**Applies to:** `src/schema.ts`

Single source of truth for all types.
All other files must import from here.
Never duplicate type definitions.

### Section Generators

**Applies to:** `src/sections/**`

Each section function returns string | null.
Return null if the section has no content.
Never return empty strings.

### Generator

**Applies to:** `src/generator.ts`

Orchestrates all sections into a single AGENTS.md.
Sections are joined with double newlines.
Never modify the output format — consumers depend on it.


## Additional Instructions

Universal Loop Agent (ULA). Este AGENTS.md activa el modo loop autónomo y adaptativo al cargarse en el chat de cualquier editor de IA. No necesitas pegar ningún prompt adicional: al cargar AGENTS.md las reglas y el start prompt se inyectan automáticamente.

1. Universal: funciona con cualquier modelo LLM y editor (OpenCode, Cursor, Copilot, Claude Code, Windsurf, Devin, Jules, Zed, Amp, Roo Code, Kilo Code, Cline, Gemini CLI, etc.). No requiere cuentas ni herramientas externas más allá de las del editor.
2. Adaptativo: se adapta al proyecto que se esté implementando. Detecta el stack, la fase actual, qué está cerrado y qué está abierto, y ajusta la metodología al producto, no al conocimiento del agente.
3. Plan en fases: implementa plan.md fase por fase, pero siempre verifica lo ya cerrado y si algún agente omitió algo.
4. Cierre basado en evidencia: una fase cerrada requiere código, pruebas que pasen y PROJECT_MEMORY.md marcado. Si 2+ agentes coinciden en que lo implementado es funcional (no solo validado), se da por cerrado, sin omitirlo de revisión cuando el usuario lo pida o otro agente ejecute AGENTS.md.
5. Calidad, rapidez, escalabilidad: investiga de forma autónoma la mejor metodología, lenguaje y framework antes de implementar.
6. Investigación con autoría: marca qué modelo hizo la investigación; otro agente puede verificarla, dar el visto bueno o aportar retroalimentación con mejoras no propuestas.
7. Preservación de contexto: los .bat nunca reemplazan archivos existentes solo porque sí. Al ejecutar init.bat, setup-all.bat o generate.bat, se comprueba si AGENTS.md, PROJECT_MEMORY.md, CHANGE_CONTROL.md, idea.md y plan.md ya existen; si existen, se actualizan solo si hace falta (contenido cambiado) y se conserva todo el contexto previo. Si no existen, se crean.
8. Orquestación paralela: varios agentes trabajan en conjunto sabiendo qué hace el otro, coordinados por PROJECT_MEMORY.md (memoria permanente), sin archivos orquestador innecesarios.

Edita universal-agent.yaml para configurar todo. Ejecuta `uagent generate` para regenerar AGENTS.md. Cárgalo en el chat para activar el modo loop.
