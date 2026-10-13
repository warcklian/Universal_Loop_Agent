# Index — Universal Loop Agent (`uagent`)

| Field | Value |
|-------|--------|
| **Stack** | TypeScript, Bun, Commander, yaml |
| **Start** | `setup-all.bat` (parent project) or `bun run src/cli.ts …` |
| **Master plan** | `Universal_Loop_Agent_Plan.md` |
| **Agent contract** | `universal-agent.yaml` → `AGENTS.md` |
| **Canonical memory** | `PROJECT_MEMORY.md` |
| **Change control** | `CONTROL_CAMBIOS.md` (register + docs before code) |
| **License** | MIT (`LICENSE`) |

## Repository tree

```
Universal_Loop_Agent/
├── LICENSE — MIT license (full text)
├── Universal_Loop_Agent_Plan.md — master plan (delivery log)
├── Index.md — this navigation map
├── PROJECT_MEMORY.md — canonical session handoff
├── CONTROL_CAMBIOS.md — local change register (canon)
├── .cursorrules — local Cursor operating contract
├── README.md — quick start, CLI, portable memory, upgrade
├── package.json — uagent bin, license MIT, bun scripts (dev/build/test/lint/typecheck)
├── bun.lock — Bun lockfile
├── tsconfig.json — TypeScript strict / bundler
├── universal-agent.yaml — source config for this repo (generates AGENTS.md)
├── AGENTS.md — generated output (gitignored; loop rules)
├── .gitignore — node_modules, dist, AGENTS.md, .uagent/memory/
├── setup-all.bat — sole Windows entry: auto-install Bun if missing → init → upgrade → idea → plan-from → generate → doctor
├── setup-all.ps1 — PowerShell equivalent of setup-all.bat
├── templates/
│   └── idea.md — portable idea/plan template copied by ensure-idea
└── src/
    ├── cli.ts — init / detect / generate / validate / upgrade / sync / adopt / plan-from / doctor / ensure-idea / write-prompt
    ├── schema.ts — SourceConfig types (single source of truth)
    ├── parser.ts — read and validate YAML → SourceConfig
    ├── generator.ts — orchestrate sections → AGENTS.md (+ frontmatter)
    ├── detector.ts — stack + light deep scan (README, src layout, scripts)
    ├── detector.test.ts — detector / parse / generateYaml / light-deep tests
    ├── memory.ts — PROJECT_MEMORY.md + .uagent/memory stubs + legacy migration
    ├── change-control.ts — CONTROL_CAMBIOS.md canon: rules, seed, ensure
    ├── change-control.test.ts — change control canon coverage
    ├── yaml-generator.ts — write universal-agent.yaml from DetectedProject
    ├── loop-defaults.ts — default autonomous loop rules + activation copy
    ├── loop-defaults.test.ts — loop defaults coverage
    ├── idea-template.ts — ensure idea.md + LOOP_START_PROMPT.txt
    ├── adapters.ts — CLAUDE / Copilot / Gemini / Cursor pointers
    ├── adopt.ts — import existing editor instruction files into YAML
    ├── plan-from.ts — idea/plan file → PROJECT_MEMORY phases
    ├── doctor.ts — portable readiness score + fix tips
    ├── features.test.ts — adapters / adopt / plan-from / doctor / idea tests
    ├── upgrade.ts — phased legacy migrate (rename + refs + verify)
    ├── upgrade.test.ts — upgrade dry-run / apply / prune tests
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
| Idea + start prompt | `src/idea-template.ts` + `templates/idea.md` |
| Change control | `src/change-control.ts` → `CONTROL_CAMBIOS.md` + Change Control section in `AGENTS.md` |
| Adapters / adopt / plan-from / doctor | `src/adapters.ts`, `src/adopt.ts`, `src/plan-from.ts`, `src/doctor.ts` |
| Legacy upgrade | `src/upgrade.ts` |
| Tests | `bun test` |

## Last review

- **Date:** 2026-10-13
- **Scope:** Local change control canon (`CONTROL_CAMBIOS.md` + docs-before-code gate), canonical filename fix (`PROJECT_MEMORY.md`), detector build commands/description/layout, AGENTS.md frontmatter

## Pending deeper review

- Public npm packaging (currently `private: true`)
- Nested AGENTS.md for monorepos (deferred)
- Real multi-agent file-locking runtime (documentary only)
- Register `CH` IDs automatically from the CLI (today the agent writes rows by hand)
