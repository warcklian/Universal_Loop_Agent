import { describe, expect, test } from "bun:test"
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
  CHANGE_CONTROL_FILE,
  CHANGE_ID_PREFIX,
  changeControlRules,
  createChangeControlSeed,
  ensureChangeControlRegister,
} from "./change-control.ts"
import { generate } from "./generator.ts"
import { parseSource } from "./parser.ts"
import { defaultConsumerLoopRules } from "./loop-defaults.ts"
import { initMemory } from "./memory.ts"
import { detectProject } from "./detector.ts"

function tmpRoot(tag: string): string {
  const root = join(tmpdir(), `uagent-cc-${tag}-${Date.now()}`)
  mkdirSync(root, { recursive: true })
  return root
}

function minimalYaml(extra: string[] = []): string[] {
  return [
    "project:",
    '  name: "Change Demo"',
    "  stack:",
    "    languages: [typescript]",
    "agent_loop:",
    "  enabled: true",
    "multi_agent:",
    "  memory:",
    "    enabled: true",
    '    canonical_file: "PROJECT_MEMORY.md"',
    ...extra,
    "",
  ]
}

describe("change control rules", () => {
  test("canon encodes register-first and documentation-before-implementation", () => {
    const rules = changeControlRules()
    const text = rules.join("\n")
    expect(text).toContain("Register before coding")
    expect(text).toContain("No row, no code")
    expect(text).toContain("Document before implementing")
    expect(text).toContain("no chat history")
    expect(text).toContain("acceptance criteria")
    expect(text).toContain("Close only when verified")
    expect(text).toContain(CHANGE_CONTROL_FILE)
  })

  test("register seed documents states and the entry table", () => {
    const seed = createChangeControlSeed("PROJECT_MEMORY.md")
    expect(seed).toContain("# Control de cambios (local)")
    expect(seed).toContain("autorizado")
    expect(seed).toContain("implementado")
    expect(seed).toContain("verificado")
    expect(seed).toContain("| ID | Fecha | Alcance | Estado | Archivos | Verificación |")
    expect(seed).toContain(`${CHANGE_ID_PREFIX}-0001`)
    expect(seed).toContain("PROJECT_MEMORY.md")
  })
})

describe("change control file generation", () => {
  test("ensureChangeControlRegister creates once and never overwrites", () => {
    const root = tmpRoot("ensure")
    try {
      ensureChangeControlRegister(root, "PROJECT_MEMORY.md")
      expect(existsSync(join(root, CHANGE_CONTROL_FILE))).toBe(true)
      writeFileSync(join(root, CHANGE_CONTROL_FILE), "# custom\n", "utf-8")
      ensureChangeControlRegister(root, "PROJECT_MEMORY.md")
      expect(readFileSync(join(root, CHANGE_CONTROL_FILE), "utf-8")).toBe("# custom\n")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("init seeds the register next to the canonical memory", () => {
    const root = tmpRoot("init")
    try {
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "seed-demo" }), "utf-8")
      initMemory(root, detectProject(root))
      expect(existsSync(join(root, CHANGE_CONTROL_FILE))).toBe(true)
      expect(existsSync(join(root, "PROJECT_MEMORY.md"))).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("change control section in AGENTS.md", () => {
  test("rendered by default and placed before the agent loop", () => {
    const source = parseSourceFrom(minimalYaml())
    const out = generate(source)
    expect(out.content).toContain("## Change Control (local)")
    expect(out.content.indexOf("## Change Control (local)")).toBeLessThan(out.content.indexOf("## Agent Loop"))
    expect(out.content).toContain(CHANGE_CONTROL_FILE)
    expect(out.content).toContain("Register before coding")
  })

  test("honours custom file and id prefix, plus project-specific rules", () => {
    const source = parseSourceFrom(
      minimalYaml([
        "change_control:",
        "  enabled: true",
        '  file: "BITACORA.md"',
        '  id_prefix: "C"',
        "  rules:",
        '    - "Require a ticket reference in every row"',
      ]),
    )
    const out = generate(source)
    expect(out.content).toContain("BITACORA.md")
    expect(out.content).toContain("C-0001")
    expect(out.content).toContain("Require a ticket reference in every row")
  })

  test("disabled by change_control.enabled: false", () => {
    const source = parseSourceFrom(minimalYaml(["change_control:", "  enabled: false"]))
    const out = generate(source)
    expect(out.content).not.toContain("## Change Control (local)")
  })
})

describe("loop gate", () => {
  test("default consumer rules require register and docs before code", () => {
    const text = defaultConsumerLoopRules()
      .map((r) => r.instruction)
      .join("\n")
    expect(text).toContain("Change control gate")
    expect(text).toContain(CHANGE_CONTROL_FILE)
    expect(text).toContain("update the documentation in detail")
    expect(text).toContain("No row and no docs update, no code")
  })
})

function parseSourceFrom(lines: string[]) {
  const root = tmpRoot("yaml")
  writeFileSync(join(root, "universal-agent.yaml"), lines.join("\n"), "utf-8")
  return parseSource(join(root, "universal-agent.yaml"))
}
