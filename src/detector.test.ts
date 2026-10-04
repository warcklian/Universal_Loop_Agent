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
      expect(Array.isArray(p.topModules)).toBe(true)
      expect(Array.isArray(p.layoutHints)).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("light deep scan reads README and src modules", () => {
    const root = makeTempProject("deep", {
      "package.json": JSON.stringify({
        name: "deep-demo",
        description: "pkg desc",
        scripts: { test: "echo", lint: "echo" },
      }),
      "README.md": "# Deep\n\nThis is a portable demo app for agents.\n\n## More\nIgnore me\n",
      "src/cli/main.ts": "export {}",
      "src/memory/store.ts": "export {}",
      "bun.lock": "",
    })
    try {
      const p = detectProject(root)
      expect(p.description).toContain("portable demo app")
      expect(p.topModules).toContain("src/cli")
      expect(p.topModules).toContain("src/memory")
      expect(p.scriptNames).toContain("test")
      expect(p.layoutHints.some((h) => h.includes("Source root"))).toBe(true)
      expect(p.languages).toContain("typescript")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("parse + generate", () => {
  test("validates repo universal-agent.yaml and emits AGENTS.md", () => {
    const source = parseSource("universal-agent.yaml")
    expect(source.project.name).toBe("Universal Loop Agent")
    expect(source.multi_agent?.memory?.canonical_file).toBe("PROJECT_MEMORY.md")
    const out = generate(source)
    expect(out.file).toBe("AGENTS.md")
    expect(out.content).toContain("PROJECT_MEMORY.md")
    expect(out.content).toContain("src/detector.ts")
    expect(out.content).toContain("Autonomous phased delivery")
    expect(out.content).toContain("Tool vs product")
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
      expect(yaml.multi_agent.memory.canonical_file).toBe("PROJECT_MEMORY.md")
      expect(yaml.build.install).toBe("bun install")
      expect(yaml.testing.unit).toBe("bun run test")
      expect(yaml.agent_loop.max_iterations).toBe(30)
      expect(yaml.agent_loop.rules.some((r) => r.instruction.includes("Autonomous phased"))).toBe(
        true,
      )
      expect(yaml.universal_instructions).toContain("toolkit is not product code")
      expect(yaml.universal_instructions).not.toContain("Universal_Loop_Agent/generate")
      expect(yaml.project.description.length).toBeGreaterThan(5)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
