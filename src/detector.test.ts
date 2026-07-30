import { describe, expect, test } from "bun:test"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { detectProject } from "./detector.ts"
import { parseSource } from "./parser.ts"
import { generate } from "./generator.ts"
import { generateYaml } from "./yaml-generator.ts"

function makeTempProject(name: string, files: Record<string, string>): string {
  const root = join(tmpdir(), `uagent-test-${name}-${Date.now()}`)
  mkdirSync(root, { recursive: true })
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel)
    mkdirSync(join(full, ".."), { recursive: true })
    writeFileSync(full, content, "utf-8")
  }
  return root
}

describe("detectProject", () => {
  test("uses bun run when bun.lock is present", () => {
    const root = makeTempProject("bun", {
      "package.json": JSON.stringify({
        name: "demo-bun",
        scripts: { dev: "echo", build: "echo", lint: "echo", test: "echo", typecheck: "echo" },
      }),
      "bun.lock": "",
      "src/main.ts": "export {}",
    })
    try {
      const p = detectProject(root)
      expect(p.packageManagers).toContain("bun")
      expect(p.buildCommands.dev).toBe("bun run dev")
      expect(p.buildCommands.install).toBe("bun install")
      expect(p.buildCommands.test).toBe("bun run test")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("falls back to npm when only package.json exists", () => {
    const root = makeTempProject("npm", {
      "package.json": JSON.stringify({
        name: "demo-npm",
        scripts: { dev: "echo" },
      }),
    })
    try {
      const p = detectProject(root)
      expect(p.packageManagers).toContain("npm")
      expect(p.buildCommands.dev).toBe("npm run dev")
      expect(p.buildCommands.install).toBe("npm install")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("parse + generate", () => {
  test("validates repo universal-agent.yaml and emits AGENTS.md", () => {
    const source = parseSource("universal-agent.yaml")
    expect(source.project.name).toBe("Universal Loop Agent")
    expect(source.multi_agent?.memory?.canonical_file).toBe("MEMORIA_PROYECTO.md")
    const out = generate(source)
    expect(out.file).toBe("AGENTS.md")
    expect(out.content).toContain("MEMORIA_PROYECTO.md")
    expect(out.content).toContain("src/detector.ts")
  })
})

describe("generateYaml", () => {
  test("includes canonical_file and bun install from detection", () => {
    const root = makeTempProject("yaml", {
      "package.json": JSON.stringify({
        name: "yaml-demo",
        scripts: { test: "bun test" },
      }),
      "bun.lock": "",
    })
    try {
      const project = detectProject(root)
      const yaml = generateYaml(project)
      expect(yaml.multi_agent.memory.canonical_file).toBe("MEMORIA_PROYECTO.md")
      expect(yaml.build.install).toBe("bun install")
      expect(yaml.testing.unit).toBe("bun run test")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
