import { describe, expect, test } from "bun:test"
import {
  defaultConsumerLoopRules,
  loopActivationLines,
  MANDATED_RULES,
  missingContractRules,
} from "./loop-defaults.ts"

describe("loop-defaults", () => {
  test("consumer rules cover autonomy, memory, resume, DoD, change control, and tool boundary", () => {
    const rules = defaultConsumerLoopRules()
    const text = rules.map((r) => r.instruction).join("\n")
    expect(text).toContain("PROJECT_MEMORY.md")
    expect(text).toContain("Autonomous phased delivery")
    expect(text).toContain("do not wait for the user to say continue")
    expect(text).toContain("Definition of Done")
    expect(text).toContain("resume from the first unchecked phase")
    expect(text).toContain("Tool boundary")
    expect(text).toContain("CHANGE_CONTROL.md")
    expect(text).not.toContain("Universal_Loop_Agent/generate")
  })

  test("activation copy: load AGENTS.md only (no paste file), phases, mandated contract", () => {
    const block = loopActivationLines().join("\n")
    expect(block).toContain("Memory duo")
    expect(block).toContain("no extra prompt to paste")
    expect(block).not.toContain("LOOP_START_PROMPT")
    expect(block).not.toContain("Suggested start prompt")
    expect(block).toContain("Autonomous phased delivery")
    expect(block).toContain("Definition of Done")
    expect(block).toContain("Tool vs product")
    expect(block).toContain("Autonomous delivery contract")
    expect(block).toContain("Portable canon vs host editor rules")
    for (const rule of MANDATED_RULES) {
      expect(block).toContain(rule)
    }
  })

  test("missingContractRules is substring-tolerant", () => {
    const partial = `We will ${MANDATED_RULES[0]} carefully.`
    expect(missingContractRules(partial)).not.toContain(MANDATED_RULES[0])
  })
})
