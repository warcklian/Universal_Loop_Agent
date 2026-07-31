# Project idea — Universal Loop Agent (`uagent`)

## Goal

Portable toolkit that turns `universal-agent.yaml` into `AGENTS.md` plus durable `PROJECT_MEMORY.md`, so one user instruction drives phased autonomous delivery across AI editors.

## Must have

1. `setup-all` one-shot setup for the parent (or current) project
2. Autonomous phased loop rules + resume from disk memory
3. Multi-editor adapters and `doctor` readiness score
4. English portable filenames; no absolute machine paths

## Nice to have

1. Public npm packaging
2. Nested AGENTS for monorepos
3. Runtime multi-agent file locking

## Out of scope (for now)

- Vector / DB memory
- Heavy AST / MCP project scanners
- Mission-control token budgets

## Notes

Product files live with the app; this toolkit folder is a helper, not application code.
