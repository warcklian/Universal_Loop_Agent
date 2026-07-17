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
    console.log(`  1. Edit universal-agent.yaml if needed`)
    console.log(`  2. Run: uagent generate`)
    console.log(`  3. Load AGENTS.md in your AI editor\n`)
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
