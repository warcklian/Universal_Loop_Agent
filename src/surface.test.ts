import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { COMMAND_NAMES } from "./commands.ts"
import { extractWiredCommands, runVerify } from "./verify.ts"
import { MANDATED_RULES, missingContractRules } from "./loop-defaults.ts"
import { generate } from "./generator.ts"
import { parseSource } from "./parser.ts"

const root = join(import.meta.dir, "..")

describe("CLI surface", () => {
  test("commands.ts names match cli.ts .command wiring", () => {
    const cli = readFileSync(join(root, "src", "cli.ts"), "utf-8")
    const wired = extractWiredCommands(cli)
    for (const name of COMMAND_NAMES) {
      expect(wired).toContain(name)
    }
  })

  test("verify . is green on the toolkit", () => {
    const report = runVerify(root)
    if (!report.ok) {
      console.error(report.findings)
    }
    expect(report.ok).toBe(true)
  })

  test("missingContractRules detects absent mandated text", () => {
    expect(missingContractRules("hello")).toEqual([...MANDATED_RULES])
    expect(missingContractRules(MANDATED_RULES.join("\n"))).toEqual([])
  })

  test("generated AGENTS.md includes coexistence paragraph", () => {
    const cfg = parseSource(join(root, "universal-agent.yaml"))
    const out = generate(cfg)
    expect(out.content).toContain("Portable canon vs host editor rules")
    expect(out.content).toContain("Host editor rules must not fork canonical memory")
  })
})
