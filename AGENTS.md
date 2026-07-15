# Universal Loop Agent

Universal agent config generator. Edit this YAML, run `uagent generate`, load AGENTS.md in your agent.

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

## Agent Loop

This section defines how the agent loop behaves. Load this file to activate loop mode.

- **Max iterations:** 15
- **Timeout:** 300s
- **Doom loop detection:** enabled — stops if no progress in 3 iterations

### Loop Rules

- Always read files before editing them
- Run tests after every change
- Run linter and type checker after edits
- If no progress in 3 iterations, stop and ask the user
- Explain what you changed and why

### How to use

- **Loop mode:** Load this file in your agent (Claude Code, Cursor, OpenCode, etc.)
- **Prompt mode:** Work without loading this file — no loop behavior activates

## Multi-Agent Coordination

### Shared Memory

- **Enabled:** yes
- **Path:** `.uagent/memory/`
- **Auto-sync:** enabled — memory persists across sessions

### Ownership Matrix

Each agent is responsible for specific file domains. Do not edit files outside your domain.

- **core:** `src/schema.ts`, `src/parser.ts`, `src/generator.ts`, `src/cli.ts`
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

This project generates a single AGENTS.md file.
Edit universal-agent.yaml to configure everything.
Run `uagent generate` to regenerate.
Load AGENTS.md in your agent to activate loop mode.
Work without the file for normal prompt mode.
