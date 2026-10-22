# Index — Universal Loop Agent (`uagent`)

| Field | Value |
|-------|--------|
| **Stack** | TypeScript, Bun, Commander, yaml |
| **Start** | `setup-all.bat` (parent project) or `bun run src/cli.ts …` |
| **Master plan** | `Universal_Loop_Agent_Plan.md` |
| **Agent contract** | `universal-agent.yaml` → `AGENTS.md` |
| **Canonical memory** | `PROJECT_MEMORY.md` |
| **Change control** | `CHANGE_CONTROL.md` (register + docs before code) |
| **License** | MIT (`LICENSE`) |

## Repository tree

```
Universal_Loop_Agent/
├── LICENSE — MIT license (full text)
├── Universal_Loop_Agent_Plan.md — master plan (delivery log)
├── Index.md — this navigation map
├── PROJECT_MEMORY.md — canonical session handoff
├── CHANGE_CONTROL.md — local change register (canon)
├── .cursorrules — local Cursor operating contract
├── README.md — quick start, CLI, portable memory, upgrade
├── package.json — uagent bin, license MIT, bun scripts (dev/build/test/lint/typecheck)
├── bun.lock — Bun lockfile
├── tsconfig.json — TypeScript strict / bundler
├── universal-agent.yaml — source config for this repo (generates AGENTS.md)
├── AGENTS.md — generated output (gitignored; loop rules)
├── .gitignore — node_modules, dist, AGENTS.md, .uagent/memory/
├── setup-all.bat — verify → init → upgrade → idea → plan-from → generate → reconcile → doctor (+ update)
├── setup-all.ps1 — PowerShell equivalent of setup-all.bat
├── docs/
│   ├── coexistence-host-editors.md — host editor rules vs portable canon
│   ├── file-lifecycle.md — create / update / rename — NEVER delete (no prune)
│   └── multi-agent-coordination.md — locks + claims (mandatory in AGENTS)
├── templates/
│   └── idea.md — portable idea/plan template copied by ensure-idea
└── src/
    ├── cli.ts — full CLI surface (see commands.ts)
    ├── commands.ts — single source of CLI command names/summaries
    ├── verify.ts — docs/scripts vs CLI self-check
    ├── reconcile.ts — AGENTS_RECONCILE.md brief for stale contracts
    ├── schema.ts — SourceConfig types (single source of truth)
    ├── parser.ts — read and validate YAML → SourceConfig
    ├── generator.ts — orchestrate sections → AGENTS.md (+ frontmatter)
    ├── detector.ts — stack + light deep scan (README, nested layouts, scripts)
    ├── fs-util.ts — BOM-tolerant text/JSON readers (package.json, YAML, README)
    ├── fs-util.test.ts — BOM reader + consumer-project regression tests
    ├── detector.test.ts — detector / parse / generateYaml / light-deep tests
    ├── memory.ts — PROJECT_MEMORY.md + .uagent/memory stubs + legacy migration
    ├── change-control.ts — CHANGE_CONTROL.md canon: rules, seed, ensure
    ├── change-control.test.ts — change control canon coverage
    ├── self-update.ts — check origin for a newer toolkit version (fast-forward only)
    ├── self-update.test.ts — update status / safe fast-forward tests
    ├── yaml-generator.ts — write universal-agent.yaml from DetectedProject
    ├── loop-defaults.ts — MANDATED_RULES + loop activation + change-control gates
    ├── loop-defaults.test.ts — loop defaults coverage
    ├── idea-template.ts — ensure idea.md; remove obsolete LOOP_START_PROMPT.txt
    ├── adapters.ts — CLAUDE / Copilot / Gemini / Cursor pointers
    ├── adopt.ts — import existing editor instruction files into YAML
    ├── plan-from.ts — idea/plan file → PROJECT_MEMORY phases
    ├── doctor.ts — portable readiness score + host_markers (info) + *_Plan.md
    ├── features.test.ts — adapters / adopt / plan-from / doctor / idea tests
    ├── surface.test.ts — CLI surface / verify coherence
    ├── coordination.ts — multi-agent locks (.uagent/locks) + memory claims
    ├── coordination.test.ts — lock/claim/TTL tests
    ├── upgrade.ts — safe migrate (toolkit root, frozen paths, stamps, diary history)
    ├── upgrade.test.ts — upgrade dry-run / apply / prune / stamp tests
    └── sections/
        └── index.ts — markdown section generators (string | null)
```

## Entry points

| Entry | Path |
|-------|------|
| Windows (all users) | `setup-all.bat` (or `setup-all.ps1`) |
| CLI | `src/cli.ts` |
| Markdown generation | `src/generator.ts` + `src/sections/index.ts` |
| Init / detection | `src/detector.ts` → `src/yaml-generator.ts` + `src/memory.ts` |
| Loop defaults | `src/loop-defaults.ts` |
| Idea template | `src/idea-template.ts` + `templates/idea.md` |
| Change control | `src/change-control.ts` → `CHANGE_CONTROL.md` + Change Control section in `AGENTS.md` |
| Self-update | src/self-update.ts → uagent update (also runs as setup-all step 0b) |
| Adapters / adopt / plan-from / doctor | `src/adapters.ts`, `src/adopt.ts`, `src/plan-from.ts`, `src/doctor.ts` |
| Legacy upgrade | `src/upgrade.ts` |
| Tests | `bun test` |

## Last review

- **Date:** 2026-10-21
- **Scope:** Port local hardening (verify/reconcile/commands, upgrade safety, host coexistence) onto origin/main; keep change-control/update/BOM; exclude max_file_lines/file_size

## Pending deeper review

- Public npm packaging (currently `private: true`)
- Nested AGENTS.md for monorepos (deferred)
- Real multi-agent file-locking runtime (documentary only)
- Register `CH` IDs automatically from the CLI (today the agent writes rows by hand)
