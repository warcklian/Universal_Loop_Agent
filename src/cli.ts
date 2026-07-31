<<<<<<< HEAD
#!/usr/bin/env bun

import { Command } from "commander"
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { dirname, resolve, join } from "node:path"
import * as readline from "node:readline"
import { parseSource, ParseError } from "./parser.ts"
import { generate } from "./generator.ts"
import { detectProject } from "./detector.ts"
import { writeYaml } from "./yaml-generator.ts"
import { initMemory, ensureMemory } from "./memory.ts"
import { formatUpgradeSummary, runUpgrade } from "./upgrade.ts"
import { syncAdapters } from "./adapters.ts"
import { adoptProject } from "./adopt.ts"
import { planFromIdea } from "./plan-from.ts"
import { formatDoctorReport, runDoctor } from "./doctor.ts"
import { ensureIdeaFile, loopStartPrompt, writeStartPromptFile } from "./idea-template.ts"

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(`  ${question} (y/N): `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes")
    })
  })
}

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(`  ${question} (y/N): `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes")
    })
  })
}

const program = new Command()

program
  .name("uagent")
  .description("Universal agent config generator — adaptative to any project")
  .version("0.1.0")

program
  .command("init")
  .description("Initialize uagent for the parent project (auto-detect stack)")
  .argument("[target]", "Target project directory (default: parent of uagent folder)", "..")
  .option("--skip-memory", "Skip memory initialization")
  .option("--skip-yaml", "Skip YAML generation (keep existing universal-agent.yaml)")
  .action((target: string, opts: { skipMemory?: boolean; skipYaml?: boolean }) => {
    const targetDir = resolve(target)
    console.log(`\n  Scanning project: ${targetDir}\n`)

    const project = detectProject(targetDir)

    console.log(`  Project:  ${project.name}`)
    console.log(`  Langs:    ${project.languages.join(", ") || "none detected"}`)
    console.log(`  Frameworks: ${project.frameworks.join(", ") || "none detected"}`)
    console.log(`  Runtime:  ${project.runtime.join(", ") || "none detected"}`)
    console.log(`  Pkg mgr:  ${project.packageManagers.join(", ") || "none detected"}`)
    console.log(`  Databases: ${project.databases.join(", ") || "none detected"}`)
    console.log(`  Git:      ${project.hasGit ? "yes" : "no"}`)
    console.log()

    if (!opts.skipYaml) {
      const yamlPath = join(targetDir, "universal-agent.yaml")
      if (existsSync(yamlPath)) {
        console.log(`  universal-agent.yaml already exists — skipping (use --force to overwrite)`)
      } else {
        writeYaml(targetDir, project)
        console.log(`  Created universal-agent.yaml`)
      }
    }

    if (!opts.skipMemory) {
      initMemory(targetDir, project)
    }

    console.log(`\n  Done! Next steps:`)
    console.log(`  1. Edit MEMORIA_PROYECTO.md (canonical handoff) and universal-agent.yaml if needed`)
    console.log(`  2. Run: uagent generate`)
    console.log(`  3. Load AGENTS.md in your AI editor (loop rules; memory stays in MEMORIA_PROYECTO.md)\n`)
  })

program
  .command("detect")
  .description("Detect project stack without generating files")
  .argument("[target]", "Target project directory", "..")
  .action((target: string) => {
    const targetDir = resolve(target)
    const project = detectProject(targetDir)

    console.log(JSON.stringify(project, null, 2))
  })

program
  .command("generate")
  .description("Generate AGENTS.md from universal-agent.yaml")
  .argument("[source]", "Path to source YAML", "universal-agent.yaml")
  .option("-o, --output <dir>", "Output directory", ".")
  .option("--dry-run", "Print without writing")
  .option("--init-memory", "Create .uagent/memory/ if missing")
  .option("--force", "Overwrite existing AGENTS.md without asking")
  .action(async (source: string, opts: { output: string; dryRun?: boolean; initMemory?: boolean; force?: boolean }) => {
    try {
      const config = parseSource(source)
      const result = generate(config)
      const outPath = resolve(opts.output, result.file)

      if (opts.dryRun) {
        console.log(`\n--- ${outPath} ---\n`)
        console.log(result.content)
        return
      }

      if (existsSync(outPath) && !opts.force) {
        const overwrite = await askConfirmation(`${result.file} already exists. Overwrite?`)
        if (!overwrite) {
          console.log(`  Skipped ${result.file}`)
          return
        }
      }

      const dir = dirname(outPath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(outPath, result.content, "utf-8")
      console.log(`Generated ${result.file} for: ${config.project.name}`)

      if (opts.initMemory && config.multi_agent?.memory?.enabled) {
        const project = detectProject(resolve("."))
        ensureMemory(resolve("."), project)
      }
    } catch (e) {
      if (e instanceof ParseError) {
        console.error(`Error: ${e.message}`)
        process.exit(1)
      }
      throw e
    }
  })

program
  .command("validate")
  .description("Validate source YAML")
  .argument("[source]", "Path to source YAML", "universal-agent.yaml")
  .action((source: string) => {
    try {
      const s = parseSource(source)
      console.log(`Valid: ${s.project.name}`)
      console.log(`  Stack:     ${s.project.stack.languages?.join(", ") ?? "not set"}`)
      console.log(`  Build:     ${s.build ? "configured" : "not set"}`)
      console.log(`  Testing:   ${s.testing ? "configured" : "not set"}`)
      console.log(`  Loop:      ${s.agent_loop ? "configured" : "not set"}`)
      console.log(`  Multi:     ${s.multi_agent ? "configured" : "not set"}`)
      console.log(`  Rules:     ${s.rules?.length ?? 0}`)
    } catch (e) {
      if (e instanceof ParseError) {
        console.error(`Invalid: ${e.message}`)
        process.exit(1)
      }
      throw e
    }
  })

program.parse()
=======
#!/usr/bin/env bun

import { Command } from "commander"
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { dirname, resolve, join } from "node:path"
import * as readline from "node:readline"
import { parseSource, ParseError } from "./parser.ts"
import { generate } from "./generator.ts"
import { detectProject } from "./detector.ts"
import { writeYaml } from "./yaml-generator.ts"
import { initMemory, ensureMemory } from "./memory.ts"

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(`  ${question} (y/N): `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes")
    })
  })
}

const program = new Command()

program
  .name("uagent")
  .description("Universal agent config generator — adaptative to any project")
  .version("0.1.0")

program
  .command("init")
  .description("Initialize uagent for the parent project (auto-detect stack)")
  .argument("[target]", "Target project directory (default: parent of uagent folder)", "..")
  .option("--skip-memory", "Skip memory initialization")
  .option("--skip-yaml", "Skip YAML generation (keep existing universal-agent.yaml)")
  .option("--force", "Overwrite existing universal-agent.yaml")
  .action((target: string, opts: { skipMemory?: boolean; skipYaml?: boolean; force?: boolean }) => {
    const targetDir = resolve(target)
    console.log(`\n  Scanning project: ${targetDir}\n`)

    const project = detectProject(targetDir)

    console.log(`  Project:  ${project.name}`)
    if (project.description) console.log(`  Summary:  ${project.description.slice(0, 120)}`)
    console.log(`  Langs:    ${project.languages.join(", ") || "none detected"}`)
    console.log(`  Frameworks: ${project.frameworks.join(", ") || "none detected"}`)
    console.log(`  Runtime:  ${project.runtime.join(", ") || "none detected"}`)
    console.log(`  Pkg mgr:  ${project.packageManagers.join(", ") || "none detected"}`)
    console.log(`  Databases: ${project.databases.join(", ") || "none detected"}`)
    if (project.topModules.length) {
      console.log(`  Modules:  ${project.topModules.slice(0, 10).join(", ")}${project.topModules.length > 10 ? ", …" : ""}`)
    }
    console.log(`  Git:      ${project.hasGit ? "yes" : "no"}`)
    console.log()

    if (!opts.skipYaml) {
      const yamlPath = join(targetDir, "universal-agent.yaml")
      if (existsSync(yamlPath) && !opts.force) {
        console.log(`  universal-agent.yaml already exists — skipping (use --force to overwrite)`)
      } else {
        const overwriting = existsSync(yamlPath)
        writeYaml(targetDir, project)
        console.log(overwriting ? `  Overwrote universal-agent.yaml` : `  Created universal-agent.yaml`)
      }
    }

    if (!opts.skipMemory) {
      initMemory(targetDir, project)
    }

    console.log(`\n  Done! Next steps:`)
    console.log(`  1. Put your idea/plan in the project (md/txt) and/or edit PROJECT_MEMORY.md`)
    console.log(`  2. Run setup-all.bat (or: uagent generate -o <project> --force --adapters)`)
    console.log(`  3. Load/attach AGENTS.md in your AI chat and give ONE instruction to implement the plan`)
    console.log(`  4. Loop mode works phases until done; memory stays in PROJECT_MEMORY.md (toolkit folder is not product code)\n`)
  })

program
  .command("detect")
  .description("Detect project stack without generating files")
  .argument("[target]", "Target project directory", "..")
  .action((target: string) => {
    const targetDir = resolve(target)
    const project = detectProject(targetDir)

    console.log(JSON.stringify(project, null, 2))
  })

program
  .command("generate")
  .description("Generate AGENTS.md from universal-agent.yaml")
  .argument("[source]", "Path to source YAML", "universal-agent.yaml")
  .option("-o, --output <dir>", "Output directory", ".")
  .option("--dry-run", "Print without writing")
  .option("--init-memory", "Create .uagent/memory/ if missing")
  .option("--force", "Overwrite existing AGENTS.md without asking")
<<<<<<< HEAD
  .option("--adapters", "Also write multi-editor adapters (CLAUDE.md, Copilot, Gemini, Cursor)")
  .option("--force-adapters", "Overwrite existing adapter files")
  .action(async (source: string, opts: {
    output: string
    dryRun?: boolean
    initMemory?: boolean
    force?: boolean
    adapters?: boolean
    forceAdapters?: boolean
  }) => {
=======
  .action(async (source: string, opts: { output: string; dryRun?: boolean; initMemory?: boolean; force?: boolean }) => {
>>>>>>> 22bb3ef495b2b824adfa337c84e9d44877d80406
    try {
      const config = parseSource(source)
      const result = generate(config)
      const outPath = resolve(opts.output, result.file)

      if (opts.dryRun) {
        console.log(`\n--- ${outPath} ---\n`)
        console.log(result.content)
        return
      }

      if (existsSync(outPath) && !opts.force) {
        const overwrite = await askConfirmation(`${result.file} already exists. Overwrite?`)
        if (!overwrite) {
          console.log(`  Skipped ${result.file}`)
          return
        }
      }

      const dir = dirname(outPath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(outPath, result.content, "utf-8")
      console.log(`Generated ${result.file} for: ${config.project.name}`)

      const projectRoot = resolve(opts.output)
      if (opts.initMemory && config.multi_agent?.memory?.enabled) {
        const project = detectProject(projectRoot)
        ensureMemory(projectRoot, project)
      }

      if (opts.adapters) {
        const synced = syncAdapters(projectRoot, { force: Boolean(opts.forceAdapters) })
        for (const w of synced.written) console.log(`  Adapter: ${w}`)
        for (const s of synced.skipped) console.log(`  Skip: ${s}`)
      }
    } catch (e) {
      if (e instanceof ParseError) {
        console.error(`Error: ${e.message}`)
        process.exit(1)
      }
      throw e
    }
  })

program
  .command("ensure-idea")
  .description("Create idea.md from template if the project has no idea/plan file")
  .argument("[target]", "Target project directory", ".")
  .action((target: string) => {
    const result = ensureIdeaFile(resolve(target))
    console.log(`\n  ${result.message}`)
    console.log(`  Path: ${result.path}\n`)
  })

program
  .command("write-prompt")
  .description("Write LOOP_START_PROMPT.txt (copy-paste prompt for the AI chat)")
  .argument("[target]", "Target project directory", ".")
  .action((target: string) => {
    const out = writeStartPromptFile(resolve(target))
    console.log(`\n  Wrote ${out}`)
    console.log(`\n  ${loopStartPrompt()}\n`)
  })

program
  .command("sync")
  .description("Write multi-editor adapters pointing at AGENTS.md (portable pointers only)")
  .argument("[target]", "Target project directory", ".")
  .option("--force", "Overwrite existing adapter files")
  .action((target: string, opts: { force?: boolean }) => {
    const targetDir = resolve(target)
    const synced = syncAdapters(targetDir, { force: Boolean(opts.force) })
    console.log(`\n  Adapters in ${targetDir}`)
    for (const w of synced.written) console.log(`  [OK] ${w}`)
    for (const s of synced.skipped) console.log(`  [--] ${s}`)
    console.log()
  })

program
  .command("adopt")
  .description("Import existing CLAUDE.md / .cursorrules / AGENTS.md into universal-agent.yaml")
  .argument("[target]", "Target project directory", ".")
  .option("--source <file>", "Preferred instruction file to adopt")
  .option("--force-yaml", "Recreate universal-agent.yaml from detection + adopt")
  .action((target: string, opts: { source?: string; forceYaml?: boolean }) => {
    const result = adoptProject(resolve(target), {
      source: opts.source,
      forceYaml: Boolean(opts.forceYaml),
    })
    console.log(`\n  ${result.message}`)
    if (result.sourceFile) console.log(`  Source: ${result.sourceFile}`)
    console.log(`  YAML:   ${result.yamlPath}`)
    console.log(`  Next:   uagent generate -o <project> --force --adapters\n`)
  })

program
  .command("plan-from")
  .description("Derive phase checklist in PROJECT_MEMORY.md from an idea/plan file")
  .argument("<idea>", "Path to idea/plan file (.md, .txt, …)")
  .argument("[target]", "Target project directory", ".")
  .action((idea: string, target: string) => {
    try {
      const result = planFromIdea(resolve(target), idea)
      console.log(`\n  ${result.message}`)
      console.log(`  Idea:   ${result.ideaFile}`)
      console.log(`  Memory: ${result.memoryFile}`)
      console.log(`  Phases:`)
      result.phases.forEach((p, i) => console.log(`    ${i + 1}. ${p}`))
      console.log(`\n  Load AGENTS.md and ask the agent to implement remaining phases.\n`)
    } catch (e) {
      console.error(`Error: ${(e as Error).message}`)
      process.exit(1)
    }
  })

program
  .command("doctor")
  .description("Portable readiness score for loop + memory + adapters")
  .argument("[target]", "Target project directory", ".")
  .action((target: string) => {
    const report = runDoctor(resolve(target))
    console.log(formatDoctorReport(report))
    if (report.score < report.max) process.exitCode = 1
  })

program
  .command("upgrade")
  .description("Detect legacy uagent artifacts and migrate filenames/refs safely (phased)")
  .argument("[target]", "Target project directory", "..")
  .option("--dry-run", "Plan and report without writing changes")
  .option("-y, --yes", "Apply without confirmation prompt")
  .option("--prune", "Remove legacy files when the new name already exists")
  .option("--batch-size <n>", "Files per scan batch (large repos)", "200")
  .option("--skip-memory", "Do not refresh .uagent/memory stubs")
  .option("--skip-agents", "Do not regenerate AGENTS.md")
  .action(async (target: string, opts: {
    dryRun?: boolean
    yes?: boolean
    prune?: boolean
    batchSize?: string
    skipMemory?: boolean
    skipAgents?: boolean
  }) => {
    const targetDir = resolve(target)
    const batchSize = Math.max(10, Number(opts.batchSize) || 200)

    console.log(`\n  Scanning for legacy uagent artifacts: ${targetDir}\n`)

    if (!opts.dryRun && !opts.yes) {
      const ok = await askConfirmation("Apply upgrade migrations to this project?")
      if (!ok) {
        console.log("  Aborted. Re-run with --dry-run to preview, or --yes to apply.")
        return
      }
    }

    const result = runUpgrade(targetDir, {
      dryRun: Boolean(opts.dryRun),
      yes: Boolean(opts.yes),
      prune: Boolean(opts.prune),
      batchSize,
      skipMemorySync: Boolean(opts.skipMemory),
      regenerateAgents: !opts.skipAgents,
    })

    console.log(formatUpgradeSummary(result))

    if (!opts.dryRun && !result.report.verify.ok) {
      process.exitCode = 1
    }
  })

program
  .command("validate")
  .description("Validate source YAML")
  .argument("[source]", "Path to source YAML", "universal-agent.yaml")
  .action((source: string) => {
    try {
      const s = parseSource(source)
      console.log(`Valid: ${s.project.name}`)
      console.log(`  Stack:     ${s.project.stack.languages?.join(", ") ?? "not set"}`)
      console.log(`  Build:     ${s.build ? "configured" : "not set"}`)
      console.log(`  Testing:   ${s.testing ? "configured" : "not set"}`)
      console.log(`  Loop:      ${s.agent_loop ? "configured" : "not set"}`)
      console.log(`  Multi:     ${s.multi_agent ? "configured" : "not set"}`)
      console.log(`  Rules:     ${s.rules?.length ?? 0}`)
    } catch (e) {
      if (e instanceof ParseError) {
        console.error(`Invalid: ${e.message}`)
        process.exit(1)
      }
      throw e
    }
  })

program.parse()
>>>>>>> ea657247f25059f94102155518e1f7eb9392381c
