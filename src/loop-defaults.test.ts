import { describe, expect, test } from "bun:test"
import { defaultConsumerLoopRules, loopActivationLines } from "./loop-defaults.ts"

describe("loop-defaults", () => {
  test("consumer rules cover autonomy, memory, resume, DoD, and tool boundary", () => {
    const rules = defaultConsumerLoopRules()
    const text = rules.map((r) => r.instruction).join("\n")
    expect(text).toContain("PROJECT_MEMORY.md")
    expect(text).toContain("Autonomous phased delivery")
    expect(text).toContain("do not wait for the user to say continue")
    expect(text).toContain("Definition of Done")
    expect(text).toContain("resume from the first unchecked phase")
    expect(text).toContain("Tool boundary")
    expect(text).not.toContain("Universal_Loop_Agent/generate")
  })

  test("activation copy mentions memory duo, start prompt, and phases", () => {
    const block = loopActivationLines().join("\n")
    expect(block).toContain("Memory duo")
    expect(block).toContain("Suggested start prompt")
    expect(block).toContain("Autonomous phased delivery")
    expect(block).toContain("Definition of Done")
    expect(block).toContain("Tool vs product")
  })
})
