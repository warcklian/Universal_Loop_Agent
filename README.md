# uagent

Universal agent config generator. Edit one YAML, generate `AGENTS.md` compatible with 28+ AI code editors.

## What it does

`uagent` takes a single `universal-agent.yaml` and generates an `AGENTS.md` file that works with OpenCode, Cursor, Copilot, Claude Code, Windsurf, Devin, Gemini CLI, and 20+ more editors.

Portable handoff lives in **`MEMORIA_PROYECTO.md`** at the consumer project root. `.uagent/memory/` only holds stubs that point there.

## Quick start

Typical layout: place this tool as a subfolder of the target project (or pass an explicit path to `init` / `generate`).

### Option 1: Windows wrappers (from this folder)

```bash
# Initialize parent project (auto-detect stack → YAML + MEMORIA_PROYECTO.md)
init.bat
# or: init.ps1

# Generate AGENTS.md in the parent directory
generate.bat
# or: generate.ps1
```

### Option 2: CLI (Bun)

```bash
bun install

# Initialize a target directory (default: parent "..")
bun run src/cli.ts init ..
bun run src/cli.ts init . --force   # overwrite YAML in current dir

# Detect stack only (JSON)
bun run src/cli.ts detect ..

# Generate / validate
bun run src/cli.ts generate ../universal-agent.yaml -o .. --force
bun run src/cli.ts validate ../universal-agent.yaml
bun run src/cli.ts generate --dry-run
```

This package is marked `"private": true` — use Bun from source or the wrappers, not a public npm publish.

## How it works

```
[detect] → universal-agent.yaml → [uagent generate] → AGENTS.md
                ↓
         MEMORIA_PROYECTO.md  (+ .uagent/memory stubs)
```

1. Run `init` (or edit `universal-agent.yaml` by hand)
2. Run `generate`
3. Load `AGENTS.md` in your AI editor
4. Keep session handoff in `MEMORIA_PROYECTO.md`

## Configuration

Edit `universal-agent.yaml` in the **target** project:

```yaml
project:
  name: "My Project"
  stack:
    languages: [typescript]
    runtime: [bun]

build:
  install: "bun install"
  dev: "bun run dev"

agent_loop:
  max_iterations: 15
  rules:
    - instruction: "Always read files before editing"
    - instruction: "Run tests after every change"

multi_agent:
  memory:
    enabled: true
    canonical_file: "MEMORIA_PROYECTO.md"
    path: ".uagent/memory/"
  ownership:
    - agent: "frontend"
      globs: ["src/components/**"]
    - agent: "backend"
      globs: ["src/api/**"]
      integrator: true
```

## Sections

| Section | What it configures |
|---------|-------------------|
| Project Overview | Name, description, stack |
| Build & Run | Install, dev, build, lint commands |
| Testing | Unit / e2e / coverage when configured |
| Code Style | Indent, quotes, conventions |
| Security | Security rules |
| Git | Commit format, branch naming |
| Agent Loop | Max iterations, timeout, loop rules |
| Multi-Agent | Canonical memory, ownership, conflict prevention |
| Project Rules | File-scoped instructions |

## Agent Loop

```yaml
agent_loop:
  enabled: true
  max_iterations: 15
  timeout_seconds: 300
  doom_loop_detection: true
```

| Mode | Behavior |
|------|----------|
| Prompt | Work without loading `AGENTS.md` |
| Loop | Load `AGENTS.md` — loop rules apply |

| Editor | How to activate |
|--------|-----------------|
| OpenCode / Cursor / Windsurf / Cline / Roo Code | Auto-detect `AGENTS.md` |
| Claude Code | In `CLAUDE.md`: `@AGENTS.md` |
| GitHub Copilot | Reference via `.github/copilot-instructions.md` |

Disable: rename/delete `AGENTS.md`, or set `agent_loop.enabled: false`.

## Multi-Agent / portable memory

| File | Role |
|------|------|
| **`MEMORIA_PROYECTO.md`** (repo root) | Canonical handoff — travels with the project |
| **`AGENTS.md`** | Agent rules / loop only (generated) |
| **`.uagent/memory/`** | Stubs pointing at `MEMORIA_PROYECTO.md` (not a second diary) |

`uagent init` creates `MEMORIA_PROYECTO.md` if missing (never overwrites) and writes stubs under `.uagent/memory/`.

## CLI commands

```bash
uagent init [target] [--force] [--skip-yaml] [--skip-memory]
uagent detect [target]
uagent generate [source] [-o dir] [--dry-run] [--force] [--init-memory]
uagent validate [source]
```

## Project structure (consumer)

```
your-project/
├── universal-agent.yaml
├── MEMORIA_PROYECTO.md
├── AGENTS.md
├── .uagent/memory/          # stubs only
└── Universal_Loop_Agent/    # this tool (optional nested layout)
    ├── init.bat / init.ps1
    └── generate.bat / generate.ps1
```

## Migration

1. Copy the project folder (any path/machine)
2. `bun install` inside `Universal_Loop_Agent/`
3. Regenerate: `bun run src/cli.ts generate` (paths relative to the YAML)

No absolute machine paths in versioned config.

## License

MIT
