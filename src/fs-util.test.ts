import { describe, expect, test } from "bun:test"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { readJsonFile, readTextFile, stripBom } from "./fs-util.ts"
import { detectProject } from "./detector.ts"
import { parseSource } from "./parser.ts"
import { runDoctor } from "./doctor.ts"

function tmpRoot(tag: string): string {
  const root = join(tmpdir(), `uagent-bom-${tag}-${Date.now()}`)
  mkdirSync(root, { recursive: true })
  return root
}

/** Write the exact bytes Windows tools produce: BOM + content. */
function writeWithBom(path: string, content: string): void {
  writeFileSync(path, "\uFEFF" + content, "utf-8")
}

describe("BOM tolerant readers", () => {
  test("stripBom removes only a leading BOM", () => {
    expect(stripBom("\uFEFF# Title")).toBe("# Title")
    expect(stripBom("# Title")).toBe("# Title")
    expect(stripBom("text \uFEFF inside")).toBe("text \uFEFF inside")
  })

  test("readTextFile strips the BOM and returns null for missing files", () => {
    const root = tmpRoot("text")
    try {
      writeWithBom(join(root, "note.md"), "# Title\n")
      expect(readTextFile(join(root, "note.md"))).toBe("# Title\n")
      expect(readTextFile(join(root, "missing.md"))).toBeNull()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("readJsonFile parses JSON saved with a BOM", () => {
    const root = tmpRoot("json")
    try {
      writeWithBom(join(root, "package.json"), JSON.stringify({ name: "bom-demo", scripts: { test: "echo" } }))
      const pkg = readJsonFile<{ name: string; scripts?: Record<string, string> }>(join(root, "package.json"))
      expect(pkg?.name).toBe("bom-demo")
      expect(pkg?.scripts?.test).toBe("echo")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("readJsonFile returns null for invalid JSON or missing files", () => {
    const root = tmpRoot("invalid")
    try {
      writeWithBom(join(root, "broken.json"), "{ not json ")
      expect(readJsonFile(join(root, "broken.json"))).toBeNull()
      expect(readJsonFile(join(root, "missing.json"))).toBeNull()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("BOM files in a consumer project", () => {
  test("detector still finds scripts when package.json has a BOM", () => {
    const root = tmpRoot("detect")
    try {
      writeWithBom(
        join(root, "package.json"),
        JSON.stringify({ name: "bom-demo", scripts: { dev: "echo", test: "echo" } }),
      )
      writeFileSync(join(root, "bun.lock"), "", "utf-8")
      const project = detectProject(root)
      expect(project.name).toBe("bom-demo")
      expect(project.scriptNames).toContain("test")
      expect(project.buildCommands.install).toBe("bun install")
      expect(project.buildCommands.dev).toBe("bun run dev")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("parser accepts a universal-agent.yaml saved with a BOM", () => {
    const root = tmpRoot("parse")
    try {
      writeWithBom(
        join(root, "universal-agent.yaml"),
        ["project:", '  name: "BOM Demo"', "  stack:", "    languages: [typescript]", ""].join("\n"),
      )
      const source = parseSource(join(root, "universal-agent.yaml"))
      expect(source.project.name).toBe("BOM Demo")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("doctor no longer reports a BOM package.json as unreadable", () => {
    const root = tmpRoot("doctor")
    try {
      writeWithBom(
        join(root, "package.json"),
        JSON.stringify({ name: "bom-doctor", scripts: { test: "echo" } }),
      )
      const report = runDoctor(root)
      const check = report.checks.find((c) => c.id === "test_script")
      expect(check?.ok).toBe(true)
      expect(check?.detail).toBe("package.json has test script")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
