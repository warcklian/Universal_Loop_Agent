# File lifecycle policy (canon — do not regress)

**Permanent rule for `uagent` / setup-all / upgrade / init / generate:**

| Situation | Action |
|-----------|--------|
| File **does not exist** | **Create** it (seed / template / generate). |
| File **already exists** | **Update** it with new features when it is a *derived* artefact (e.g. `AGENTS.md` from YAML), or **leave it unchanged** when it is user handoff (memory, change register, idea, stamps). |
| File exists under a **legacy name** | **Rename only** to the new English name. **Never delete.** |
| Both legacy and new names exist | Keep both; rewrite references toward the new name; warn for manual merge if both have substance. **Do not prune.** |

## Do not use `--prune`

`--prune` deletes legacy files. That has caused loss of important project content more than once.

- **setup-all** must never pass `--prune`.
- Normal workflows: `uagent upgrade .. --dry-run` then `uagent upgrade .. --yes` (optionally `--skip-agents-regen`).
- Deleting a leftover legacy file is a **human** decision after confirming the new file holds the content.
- The CLI keeps `--prune` only behind an explicit dangerous flag (`--i-accept-deletes`). Prefer not to use it.

## What may be updated vs what must never be wiped

| Path | Policy |
|------|--------|
| `PROJECT_MEMORY.md` (or `canonical_file`) | Create if missing; never overwrite substance; upgrade may rename from legacy name only |
| `## Phases` inside memory | Create/insert only when missing or empty; if a checklist already exists, **leave it** (keeps `[x]`). Use `uagent plan-from … --force` only when you intentionally want a refresh |
| `CHANGE_CONTROL.md` | Create if missing; never overwrite |
| `idea.md` / `*_Plan.md` | Create template if missing; never overwrite |
| `universal-agent.yaml` | Create if missing on init; never overwrite without explicit adopt `--force` |
| `AGENTS.md` | Derived from YAML — may be regenerated when content differs (edit YAML, not AGENTS by hand) |
| Adapters (`CLAUDE.md`, …) | Create if missing; do not force-replace customized ones in setup-all |
| `LOOP_START_PROMPT.txt` | **Obsolete** — do not create. Loading `AGENTS.md` activates the loop. Removed automatically when `AGENTS.md` is generated or updated |
| `.uagent/*.stamp` | Host-only; never delete or rewrite |
| Nested `Universal_Loop_Agent/` | Toolkit; never rewrite on consumer upgrade |

## One-line summary

**Create if missing → update features in place → rename legacy names → never delete.**
