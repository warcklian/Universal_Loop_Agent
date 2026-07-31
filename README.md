# uagent

**Loop agent + portable project memory.**  
One setup → `AGENTS.md` (rules in chat) + `PROJECT_MEMORY.md` (handoff on disk). You give **one** instruction; the agent works **phase by phase** until the plan is done — without you saying “continue”.

Works with Cursor, Copilot, Claude Code, OpenCode, Windsurf, and 20+ editors that read `AGENTS.md`.

---

## Start in 3 steps

### 1. Put the toolkit in your project

```
your-project/
├── (your code or empty folder)
└── Universal_Loop_Agent/     ← this repo (subfolder)
```

Bun is required once. If it is missing, `setup-all` installs it automatically (Windows: official `bun.sh` installer). Manual: https://bun.sh

### 2. Run setup (double-click)

From `Universal_Loop_Agent/`:

```bash
setup-all.bat
```

(`setup-all.ps1` on PowerShell. Needs network the first time if Bun is not installed.)

Creates/updates in the **parent** project: `idea.md`, `PROJECT_MEMORY.md`, `universal-agent.yaml`, `AGENTS.md`, adapters, `LOOP_START_PROMPT.txt`.

Edit `idea.md` if the template is empty, then run `setup-all.bat` again.

### 3. Open the project and start the loop

1. Open the **parent** project in your AI editor  
2. Load / attach **`AGENTS.md`**  
3. Paste the prompt from **`LOOP_START_PROMPT.txt`** (or below)

```
Load AGENTS.md (loop mode). Read PROJECT_MEMORY.md and idea.md (or the plan). Implement the project phase by phase until all phases are done. For each phase: implement → run tests/checks → mark the phase done in PROJECT_MEMORY.md → continue to the next phase. Do not ask me to say continue between successful phases. Only stop if blocked (secrets, irreversible action, real ambiguity, or doom-loop). If this chat is a resume: do not redo completed phases; continue from the first unchecked phase in PROJECT_MEMORY.md.
```

That is the whole day-1 flow.

---

## What you get

| File | Role |
|------|------|
| **`AGENTS.md`** | Loop rules **in the chat** |
| **`PROJECT_MEMORY.md`** | Durable phases / blockers — **travels with the repo** |
| **`idea.md`** | Your idea/plan (template created if missing) |
| **`LOOP_START_PROMPT.txt`** | Copy-paste start prompt |
| **`universal-agent.yaml`** | Source config — edit, then re-run `setup-all.bat` |

### Tool vs product

| Product (commit these) | Toolkit (optional helper) |
|------------------------|---------------------------|
| `AGENTS.md`, `PROJECT_MEMORY.md`, `idea.md`, `universal-agent.yaml`, `.uagent/memory/` | `Universal_Loop_Agent/` + `setup-all.bat` |

The app must **not** import the toolkit as application code.

### Resume after a long chat

New chat → load `AGENTS.md` → paste `LOOP_START_PROMPT.txt` (includes resume).  
Disk memory is the source of truth; finished phases are not redone.

---

## What setup-all runs

1. Install toolkit deps if needed  
2. `init` — detect stack (incl. light README/src scan)  
3. `upgrade` — legacy renames/refs  
4. `ensure-idea` — create `idea.md` template if missing  
5. `plan-from` — phases into `PROJECT_MEMORY.md`  
6. `generate --adapters` + `write-prompt`  
7. `doctor` — score + fix tips  

---

## Advanced (CLI)

Use when you prefer Bun commands instead of `setup-all.bat`:

```bash
bun install
bun run src/cli.ts init ..
bun run src/cli.ts ensure-idea ..
bun run src/cli.ts plan-from ../idea.md ..
bun run src/cli.ts generate ../universal-agent.yaml -o .. --force --adapters
bun run src/cli.ts write-prompt ..
bun run src/cli.ts doctor ..
bun run src/cli.ts validate ../universal-agent.yaml
bun run src/cli.ts upgrade .. --yes --prune
bun run src/cli.ts sync .. --force
bun run src/cli.ts adopt ..
```

Package is `"private": true` — run from source / `setup-all`, not npm publish.

### Configuration sketch

```yaml
# universal-agent.yaml (project root)
project:
  name: "My Project"
  stack:
    languages: [typescript]
    runtime: [bun]
agent_loop:
  enabled: true
  max_iterations: 30
  doom_loop_detection: true
multi_agent:
  memory:
    enabled: true
    canonical_file: "PROJECT_MEMORY.md"
```

### Extra portable features

| Feature | Command |
|---------|---------|
| Multi-editor adapters | `generate --adapters` / `sync` |
| Frontmatter on AGENTS.md | automatic |
| Import CLAUDE.md / .cursorrules | `adopt` |
| Phases from idea | `plan-from` / setup-all |
| Readiness score | `doctor` |
| Light deep detect | always on in `init`/`detect` (no heavy deps) |

Not in scope on purpose: AST/MCP scanners, vector DB memory, mission-control budgets.

### Upgrade only

```bash
bun run src/cli.ts upgrade .. --yes --prune
# or just re-run setup-all.bat
```

Report: `.uagent/upgrade-report.json`.

### Layout

```
your-project/
├── idea.md
├── LOOP_START_PROMPT.txt
├── universal-agent.yaml
├── PROJECT_MEMORY.md
├── AGENTS.md
├── .uagent/memory/
└── Universal_Loop_Agent/
    ├── setup-all.bat
    ├── setup-all.ps1
    └── templates/idea.md
```

### Portability

Copy the project folder anywhere. No absolute machine paths. Re-run `setup-all.bat` after moving if you keep the toolkit nested (`bun install` inside it once).

## License

[MIT](./LICENSE) — Copyright (c) 2026 Jorge Octavio Gomez Gonzalez (Warcklian).

You may use, modify, and redistribute this toolkit freely, including in commercial
projects, provided you keep the copyright and permission notice. The software is
provided as-is, without warranty.
