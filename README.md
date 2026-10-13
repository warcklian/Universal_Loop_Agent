# uagent

Universal agent config generator. Edit one YAML, generate `AGENTS.md` compatible with 28+ AI code editors.

## What it does

`uagent` takes a single `universal-agent.yaml` and generates an `AGENTS.md` file that works with OpenCode, Cursor, Copilot, Claude Code, Windsurf, Devin, Gemini CLI, and 20+ more editors.

## Quick start

### Option 1: Using .bat files (Windows)

```bash
# Initialize (auto-detects project, creates universal-agent.yaml)
init.bat

# Generate AGENTS.md
generate.bat
```

### Option 2: Using CLI

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
| Change Control | Local change register + docs-before-code gate |
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

### Using the Agent Loop

**Prompt mode (default)**: Work normally — no loop behavior activates.

**Loop mode**: Load `AGENTS.md` in your agent to activate. The agent will follow the loop rules defined in your config.

**How to activate per editor:**

| Editor | How to activate |
|--------|-----------------|
| OpenCode | Auto-detected — just load the project |
| Cursor | Auto-detected — AGENTS.md in project root |
| GitHub Copilot | Auto-detected via `.github/copilot-instructions.md` referencing AGENTS.md |
| Claude Code | Add to `CLAUDE.md`: `@AGENTS.md` |
| Windsurf | Auto-detected |
| Cline | Auto-detected |
| Roo Code | Auto-detected |

**What the loop does:**
- Agent reads files before editing
- Runs tests after changes
- Stops if no progress in 3 iterations (doom loop detection)
- Reports what was changed and why

**To disable loop**: Delete or rename `AGENTS.md`, or set `agent_loop.enabled: false` in your YAML.

## Multi-Agent

The `multi_agent` section configures coordination between agents:

```yaml
multi_agent:
  memory:
    enabled: true
    # Canonical portable handoff (repo root). Agents read/update this file.
    canonical_file: "PROJECT_MEMORY.md"
    # Stubs only — pointers to canonical_file (do not keep a second diary here)
    path: ".uagent/memory/"
    auto_sync: true
  ownership:
    - agent: "core"
      globs: ["src/core/**"]
    - agent: "api"
      globs: ["src/api/**"]
      integrator: true
  conflict:
    file_locking: true
    strategy: topological

change_control:
  enabled: true
  file: "CONTROL_CAMBIOS.md"
  id_prefix: "CH"
```

### Portable project memory

| File | Role |
|------|------|
| **`PROJECT_MEMORY.md`** (repo root) | Canonical handoff — travels with the project |
| **`CONTROL_CAMBIOS.md`** (repo root) | Local change register — row before code, docs before implementing |
| **`AGENTS.md`** | Agent rules / loop only (generated from repo-root `universal-agent.yaml`) |
| **`.uagent/memory/`** | Stubs pointing at `PROJECT_MEMORY.md` |

`uagent init` creates `PROJECT_MEMORY.md` and `CONTROL_CAMBIOS.md` if missing (never overwrites) and writes stubs under `.uagent/memory/`.

## Change Control (local)

Every project gets a local change register at its root. The generated loop turns it into a gate that runs **before** any code is written:

| Step | Rule |
|------|------|
| **1. Register** | Every authorized change starts as a row in `CONTROL_CAMBIOS.md` (ID `CH-0001`…, date, scope, status `autorizado`). No row, no code. |
| **2. Document** | Before implementing, the docs are updated **in detail** so any agent with only the repository can develop it: what and why, files affected, exact steps, acceptance criteria, how to verify. |
| **3. Close** | The row moves to `implementado` → `verificado` only when code, checks and docs agree; files touched and verification evidence are recorded. |

The register is created by `uagent init` (never overwritten), checked by `uagent doctor`, and referenced from the generated `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` and `LOOP_START_PROMPT.txt`. Rename it with `change_control.file`; disable it with `change_control.enabled: false`.

**Full docs/scripts sync (multi-agent):** the generated loop includes a rule to sync the **whole** documentation/scripts canon after each substantive delivery (not only files from the latest feature). Edit the rule in the project's `universal-agent.yaml`, then run `generate.bat` / `generate.ps1` from this folder so `AGENTS.md` stays portable across machines and AI editors.

## Project structure

```
your-project/
├── universal-agent.yaml    # Edit this
├── AGENTS.md               # Generated (auto-detected by editors)
├── PROJECT_MEMORY.md       # Canonical portable handoff
├── CONTROL_CAMBIOS.md      # Local change register
└── .uagent/
    └── memory/             # Local memory stubs (not in git, moves with folder)
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
