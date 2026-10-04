# Sistema_Gestion_Oficios

Project: Sistema_Gestion_Oficios

**Databases:** postgresql

## Code Style

- Indentation: 2 spaces
- Quotes: double
- Semicolons: no
- Max line length: 100

Conventions:
- Keep functions small and focused
- Use descriptive variable and function names

## Security

- Never commit secrets or API keys
- Use environment variables for configuration
- Validate all user input

## Git Conventions

- **Commit format:** conventional
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

### Conflict Prevention

- **File locking:** enabled — lock files before editing
- **Auto-detect collisions:** enabled — warn on concurrent edits
- **Merge strategy:** topological

## Additional Instructions

This project is Sistema_Gestion_Oficios.
Edit universal-agent.yaml to configure everything.
Run `uagent generate` to regenerate.
Load AGENTS.md in your agent to activate loop mode.
