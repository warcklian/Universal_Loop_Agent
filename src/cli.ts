#!/usr/bin/env bun

import { Command } from "commander"
import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { parseSource, ParseError } from "./parser.ts"
import { generate } from "./generator.ts"

const program = new Command()

program
  .name("uagent")
  .description("Generate AGENTS_LOOP.md from universal-agent.yaml")
  .version("0.1.0")

program
  .command("generate")
  .description("Generate AGENTS_LOOP.md")
  .argument("[source]", "Path to source YAML", "universal-agent.yaml")
  .option("-o, --output <dir>", "Output directory", ".")
  .option("--dry-run", "Print without writing")
  .action((source: string, opts: { output: string; dryRun?: boolean }) => {
    try {
      const config = parseSource(source)
      const result = generate(config)
      const outPath = resolve(opts.output, result.file)

      if (opts.dryRun) {
        console.log(`\n--- ${outPath} ---\n`)
        console.log(result.content)
        return
      }

      const dir = dirname(outPath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(outPath, result.content, "utf-8")
      console.log(`Generated ${result.file} for: ${config.project.name}`)
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
