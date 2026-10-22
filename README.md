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
  file: "CHANGE_CONTROL.md"
  id_prefix: "CH"
```

### Portable project memory

| File | Role |
|------|------|
| **`PROJECT_MEMORY.md`** (repo root) | Canonical handoff — travels with the project |
| **`CHANGE_CONTROL.md`** (repo root) | Local change register — row before code, docs before implementing |
| **`AGENTS.md`** | Agent rules / loop only (generated from repo-root `universal-agent.yaml`) |
| **`.uagent/memory/`** | Stubs pointing at `PROJECT_MEMORY.md` |

`uagent init` creates `PROJECT_MEMORY.md` and `CHANGE_CONTROL.md` if missing (never overwrites) and writes stubs under `.uagent/memory/`.

## Change Control (local)

Every project gets a local change register at its root. The generated loop turns it into a gate that runs **before** any code is written:

| Step | Rule |
|------|------|
| **1. Register** | Every authorized change starts as a row in `CHANGE_CONTROL.md` (ID `CH-0001`…, date, scope, status `authorized`). No row, no code. |
| **2. Document** | Before implementing, the docs are updated **in detail** so any agent with only the repository can develop it: what and why, files affected, exact steps, acceptance criteria, how to verify. |
| **3. Close** | The row moves to `implemented` → `verified` only when code, checks and docs agree; files touched and verification evidence are recorded. |

The register is created by `uagent init` (never overwritten), checked by `uagent doctor`, and referenced from the generated `AGENTS.md`, `CLAUDE.md` and `.github/copilot-instructions.md`. Rename it with `change_control.file`; disable it with `change_control.enabled: false`.

**Full docs/scripts sync (multi-agent):** the generated loop includes a rule to sync the **whole** documentation/scripts canon after each substantive delivery (not only files from the latest feature). Edit the rule in the project's `universal-agent.yaml`, then run `generate.bat` / `generate.ps1` from this folder so `AGENTS.md` stays portable across machines and AI editors.

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

| Command | Purpose |
|---------|---------|
| `init` | Detect stack; write YAML + canonical memory + stubs (never overwrite memory with substance) |
| `detect` | Print detected stack without writing |
| `generate` | Generate `AGENTS.md` (`--force`, `--adapters`, `--dry-run`, `--init-memory`) |
| `validate` | Parse `universal-agent.yaml` |
| `upgrade` | Migrate legacy names/refs (`--dry-run`, `--yes`; **never use `--prune` in normal flows**) |
| `update` | Self-update this toolkit from origin (fast-forward only) |
| `sync` | Write multi-editor adapters pointing at `AGENTS.md` |
| `adopt` | Import existing editor instructions into YAML |
| `plan-from` | Idea/plan → phases in canonical memory |
| `doctor` | Readiness score for loop + memory + change control |
| `verify` | Self-check: docs/scripts vs registered CLI (exit 1 if inconsistent) |
| `reconcile` | Write `.uagent/AGENTS_RECONCILE.md` when `AGENTS.md` is stale |
| `ensure-idea` | Create `idea.md` from template when missing |
| `write-prompt` | Remove obsolete `LOOP_START_PROMPT.txt` (load `AGENTS.md` is enough) |
| `coord:register` | Register agent session → `agentId` |
| `coord:unregister` | Unregister and release locks/claims |
| `coord:heartbeat` | Renew lock/claim TTL (default 30 min) |
| `coord:lock` | Acquire file locks under `.uagent/locks/` |
| `coord:unlock` | Release locks |
| `coord:locks` | List locks |
| `coord:conflicts` | Detect live foreign locks |
| `coord:cleanup` | Drop stale locks/claims past TTL |
| `coord:claim` | Claim a phase in `PROJECT_MEMORY.md` Active claims |
| `coord:claim:release` | Release a phase claim |

```bash
uagent generate --adapters
uagent validate
uagent update --check
uagent verify .
uagent reconcile ..
uagent upgrade .. --dry-run
uagent coord:register . -n "Alice" -i cursor
uagent coord:cleanup .
```

### Multi-agent (locks + claims)

See [docs/multi-agent-coordination.md](docs/multi-agent-coordination.md).

- State lives in the **product** folder (portable). Locks are gitignored; claims live in versioned memory.
- `AGENTS.md` makes register → claim → lock **mandatory** before editing a phase.
- Same `AGENTS.md` for every agent: take the first free phase; never mark another agent's live phase `[x]`.

`setup-all` runs `verify` first (FAIL aborts), then init → upgrade → idea → plan-from → generate → `reconcile` (WARN continues) → doctor. It also keeps the toolkit `update` check.

### Canonical memory

`multi_agent.memory.canonical_file` is authoritative (default `PROJECT_MEMORY.md`). Doctor, init, upgrade, and generated `AGENTS.md` honour that name. The toolkit does not rename or prune the canonical file without an explicit `upgrade` migration.

### File lifecycle (create / update / rename — never delete)

**Canon policy** — see [docs/file-lifecycle.md](docs/file-lifecycle.md). Do not regress this:

1. **Missing** → create (seed / template / generate).
2. **Already exists** → update derived files with new features, or leave user handoff untouched.
3. **Legacy name** → **rename only**. Never delete the old file automatically.
4. **Both names exist** → keep both; rewrite refs to the new name; merge by hand if needed.

**Do not use `--prune`.** It has caused loss of important files before. `setup-all` never passes `--prune`. The flag is ignored unless you also pass `--i-accept-deletes` (emergency only). Prefer deleting a leftover legacy file yourself after you confirm the new name has the content.

### Upgrade safety

- Never auto-migrates the toolkit root itself.
- Skips nested toolkit folders, `tool.exclude_paths`, and frozen release/archive directories.
- Does not rewrite historical mentions inside diary files (e.g. old names quoted in `PROJECT_MEMORY.md`).
- Host markers (`.uagent/*.stamp`) are never deleted or rewritten.

### Verify + reconcile

- `uagent verify .` — docs/scripts must match `src/commands.ts` and `cli.ts`.
- `uagent reconcile ..` — compares `AGENTS.md` to the mandated autonomy contract; writes a brief for the AI under `.uagent/AGENTS_RECONCILE.md`.

## Host editor rules vs portable canon

See [docs/coexistence-host-editors.md](docs/coexistence-host-editors.md).

- `uagent` writes the canon in the **product** root (`..` from setup-all).
- That canon (`AGENTS.md` + canonical memory + YAML) is the only multi-editor coordination.
- Optional host-editor profile rules may ensure the toolkit/canon exists; they must not create a second handoff or override loop/memory rules.
- Host-only markers such as `.uagent/*.stamp` are ignored by uagent and never deleted by upgrade.

## Toolkit self-update

The toolkit folder is a git clone, so it can tell when the remote is ahead. `setup-all.bat` / `setup-all.ps1` run this check as step **0b** before anything else, and you can also run it any time with `uagent update`.

| Situation | What happens |
|-----------|--------------|
| Remote ahead | `git fetch` + `git merge --ff-only` — the toolkit jumps to the latest commit |
| Already up to date | Nothing, reports `up-to-date` |
| Local commits not pushed | Reports `ahead`, does not touch history |
| Uncommitted changes | Reports `dirty` and stops — you commit or stash first |
| Diverged / detached HEAD | Reports it and stops — history is never rewritten |
| Offline, no remote, or no git | Reports why and keeps the local version |

The update is **fast-forward only**: it never resets, never force-pushes and never discards your work. Only the toolkit folder is updated — your project files are untouched.

## Project structure

```
your-project/
├── universal-agent.yaml    # Edit this
├── AGENTS.md               # Generated (auto-detected by editors)
├── PROJECT_MEMORY.md       # Canonical portable handoff
├── CHANGE_CONTROL.md       # Local change register
└── .uagent/
    └── memory/             # Local memory stubs (not in git, moves with folder)
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
