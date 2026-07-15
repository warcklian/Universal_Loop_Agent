# uagent

Universal agent config generator. Edit one YAML, generate `AGENTS.md` compatible with 28+ AI code editors.

## What it does

`uagent` takes a single `universal-agent.yaml` and generates an `AGENTS.md` file that works with OpenCode, Cursor, Copilot, Claude Code, Windsurf, Devin, Gemini CLI, and 20+ more editors.

## Quick start

```bash
# Install
npm install -g uagent

# Or with bun
bun install -g uagent

# Initialize
uagent init

# Edit universal-agent.yaml
# Generate AGENTS.md
uagent generate
```

## How it works

```
universal-agent.yaml → [uagent generate] → AGENTS.md
```

1. You edit `universal-agent.yaml` with your project info
2. Run `uagent generate`
3. Load `AGENTS.md` in your AI editor
4. The editor picks it up automatically

## Configuration

Edit `universal-agent.yaml`:

```yaml
project:
  name: "My Project"
  stack:
    languages: [typescript]
    runtime: [node 22]

build:
  install: "npm install"
  dev: "npm run dev"
  test: "npm test"

agent_loop:
  max_iterations: 15
  rules:
    - instruction: "Always read files before editing"
    - instruction: "Run tests after every change"

multi_agent:
  memory:
    enabled: true
    path: ".uagent/memory/"
  ownership:
    - agent: "frontend"
      globs: ["src/components/**"]
    - agent: "backend"
      globs: ["src/api/**"]
      integrator: true
```

## Sections

The generated `AGENTS.md` includes:

| Section | What it configures |
|---------|-------------------|
| Project Overview | Name, description, stack |
| Build & Run | Install, dev, build, lint commands |
| Testing | Unit, e2e, coverage commands |
| Code Style | Indent, quotes, conventions |
| Security | Security rules |
| Git | Commit format, branch naming |
| Agent Loop | Max iterations, timeout, loop rules |
| Multi-Agent | Memory, ownership matrix, conflict prevention |
| Project Rules | File-scoped instructions |

## Agent Loop

The `agent_loop` section defines how your agent behaves in loop mode:

```yaml
agent_loop:
  enabled: true
  max_iterations: 15
  timeout_seconds: 300
  doom_loop_detection: true
  rules:
    - instruction: "Always read files before editing"
    - instruction: "Run tests after every change"
    - instruction: "If no progress in 3 iterations, stop and ask"
```

**Prompt mode**: Work without loading `AGENTS.md` — no loop behavior.
**Loop mode**: Load `AGENTS.md` in your agent — loop activates.

## Multi-Agent

The `multi_agent` section configures coordination between agents:

```yaml
multi_agent:
  memory:
    enabled: true
    path: ".uagent/memory/"
  ownership:
    - agent: "core"
      globs: ["src/core/**"]
    - agent: "api"
      globs: ["src/api/**"]
      integrator: true
  conflict:
    file_locking: true
    strategy: topological
```

## Compatibility

`AGENTS.md` is auto-detected by:

| Editor | Auto-detected |
|--------|:------------:|
| OpenCode | ✅ |
| Codex | ✅ |
| GitHub Copilot | ✅ |
| Cursor | ✅ |
| Windsurf | ✅ |
| Devin | ✅ |
| Jules | ✅ |
| Zed | ✅ |
| Amp | ✅ |
| Roo Code | ✅ |
| Kilo Code | ✅ |
| Cline | ✅ |
| Claude Code | via `CLAUDE.md` → `@AGENTS.md` |
| Gemini CLI | via config |

## CLI commands

```bash
# Generate AGENTS.md
uagent generate

# Validate universal-agent.yaml
uagent validate

# Preview without writing
uagent generate --dry-run
```

## Project structure

```
your-project/
├── universal-agent.yaml    # Edit this
├── AGENTS.md               # Generated (auto-detected by editors)
└── .uagent/
    └── memory/             # Local memory (not in git, moves with folder)
```

## Migration

The project is fully portable. To move to another machine or path:

1. Copy the entire project folder (USB, network, cloud, etc.)
2. Reinstall dependencies: `bun install`
3. Regenerate: `bun run src/cli.ts generate`

All paths in `universal-agent.yaml` are relative — no absolute paths to fix.

**Memory**: `.uagent/memory/` is not in git but moves with the folder. Each project has its own memory.

## License

MIT
