# Host editor rules vs portable canon

`uagent` generates a **portable canon** in the target project root (parent `..` from `setup-all`). That canon is the only multi-agent / multi-editor coordination contract.

```
Toolkit (Universal_Loop_Agent / uagent)
        │
        │  init / generate / upgrade / adapters
        ▼
Product canon (project root)
  · universal-agent.yaml
  · AGENTS.md
  · PROJECT_MEMORY.md   (or multi_agent.memory.canonical_file)
  · .uagent/memory/*    (stubs only)
  · optional idea.md / CHANGE_CONTROL.md
        ▲
        │  read / update
All agents (any editor, with or without host profile rules)
```

## Canon (portable — any agent)

| File | Role |
|------|------|
| `universal-agent.yaml` | Editable source of the loop |
| `AGENTS.md` | Generated loop / multi-agent contract |
| `PROJECT_MEMORY.md` | Canonical handoff / phases |
| `.uagent/memory/*` | Pointers to canonical memory (not a second diary) |
| Adapters (`CLAUDE.md`, …) | Thin pointers at `AGENTS.md` (create-if-missing) |

## Host-only (optional editor profile)

| File | Role |
|------|------|
| `.uagent/*.stamp` (e.g. bootstrap markers) | Editor-local metadata; **ignored** by uagent readiness; never deleted by upgrade (see `docs/file-lifecycle.md`) |

Host profile rules (when present) may:

- clone or ensure the toolkit exists
- ensure the three canon artifacts exist

They must **not**:

- redefine `PROJECT_MEMORY.md` or the loop contract during bootstrap
- create a second handoff outside the canonical memory file
- be required for agents that only load `AGENTS.md`

Agents without host profile rules follow **only** the portable canon. Host editor rules must not fork canonical memory.
