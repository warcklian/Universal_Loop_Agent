# Multi-agent coordination (locks + claims)

Portable orchestration for several models/agents on the **same product folder**.
Independent of Cursor User Rules — any editor that loads `AGENTS.md` must follow this.

## Where state lives (migrates with the project)

| Path | Git | Role |
|------|-----|------|
| `PROJECT_MEMORY.md` → `## Active claims` | versioned | Durable phase reservation + resume |
| `.uagent/locks/*.json` | **ignored** | Short-lived file locks (TTL) |
| `.uagent/agents.json` | **ignored** | Session registry (agentId) |
| `AGENTS.md` | generated | **Mandatory** coord rules |

Copying the whole project folder preserves everything (including live locks).
A fresh `git clone` has no locks (expected); claims/phases come from memory.

## Same prompt for every agent

> Load AGENTS.md. Analyze the project and implement what is missing phase by phase.

Each agent:

1. `uagent coord:cleanup .`
2. `uagent coord:register . -n "<name>" -i "<ide>"` → save `agentId`
3. Read `PROJECT_MEMORY.md` — first unchecked phase that is **not** in a live claim
4. `uagent coord:claim . --agent-id <id> --phase "<title>" --files a.ts,b.ts`
5. `uagent coord:lock . --agent-id <id> --files a.ts,b.ts --phase "<title>"`
6. Implement; `coord:heartbeat` while working
7. Mark phase `[x]` **only if you hold the claim**; then unlock + `coord:claim:release`

Default TTL: **30 minutes** without heartbeat → stale → cleanup frees the phase/files.

## CLI

```bash
uagent coord:register . -n "Alice" -i cursor
uagent coord:cleanup .
uagent coord:claim . --agent-id <id> --phase "Phase Alpha" --files src/a.ts
uagent coord:lock . --agent-id <id> --files src/a.ts --phase "Phase Alpha"
uagent coord:heartbeat . --agent-id <id>
uagent coord:conflicts . --agent-id <id> --files src/a.ts
uagent coord:unlock . --agent-id <id>
uagent coord:claim:release . --agent-id <id> --phase "Phase Alpha"
uagent coord:unregister . --agent-id <id>
```

## Policy

Locks and claims are **mandatory** in generated `AGENTS.md` (see Autonomous delivery contract).
They do not replace ownership globs — they enforce them at session time.
