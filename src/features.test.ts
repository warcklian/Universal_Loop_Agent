import { describe, expect, test } from "bun:test"
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { syncAdapters, buildAdapters } from "./adapters.ts"
import { adoptProject } from "./adopt.ts"
import { planFromIdea } from "./plan-from.ts"
import { runDoctor } from "./doctor.ts"
import { generate } from "./generator.ts"
import { parseSource } from "./parser.ts"
import { ensureIdeaFile, loopStartPrompt, writeStartPromptFile } from "./idea-template.ts"

function tmpRoot(tag: string): string {
  const root = join(tmpdir(), `uagent-feat-${tag}-${Date.now()}`)
  mkdirSync(root, { recursive: true })
  return root
}

describe("idea template", () => {
  test("creates idea.md once and writes start prompt", () => {
    const root = tmpRoot("idea")
    try {
      const first = ensureIdeaFile(root)
      expect(first.created).toBe(true)
      expect(existsSync(join(root, "idea.md"))).toBe(true)
      const second = ensureIdeaFile(root)
      expect(second.created).toBe(false)
      const promptPath = writeStartPromptFile(root)
      expect(existsSync(promptPath)).toBe(true)
      expect(loopStartPrompt()).toContain("phase by phase")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("adapters", () => {
  test("buildAdapters returns relative portable pointers", () => {
    const list = buildAdapters()
    expect(list.some((a) => a.path === "CLAUDE.md")).toBe(true)
    expect(list.find((a) => a.path === "CLAUDE.md")?.content).toContain("@AGENTS.md")
    expect(list.find((a) => a.path === ".gemini/settings.json")?.content).toContain("AGENTS.md")
  })

  test("syncAdapters writes then skips without force", () => {
    const root = tmpRoot("adapters")
    try {
      const first = syncAdapters(root)
      expect(first.written.length).toBeGreaterThan(2)
      expect(existsSync(join(root, "CLAUDE.md"))).toBe(true)
      const second = syncAdapters(root)
      expect(second.skipped.length).toBeGreaterThan(0)
      const forced = syncAdapters(root, { force: true })
      expect(forced.written.length).toBeGreaterThan(0)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("adopt", () => {
  test("creates yaml from CLAUDE.md when missing", () => {
    const root = tmpRoot("adopt")
    try {
      writeFileSync(join(root, "CLAUDE.md"), "# Rules\n\nUse strict TypeScript.\n", "utf-8")
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "adopt-demo", scripts: { test: "echo" } }), "utf-8")
      const result = adoptProject(root)
      expect(result.createdYaml).toBe(true)
      expect(existsSync(join(root, "universal-agent.yaml"))).toBe(true)
      const yaml = readFileSync(join(root, "universal-agent.yaml"), "utf-8")
      expect(yaml).toContain("Use strict TypeScript")
      expect(yaml).toContain("adopted from existing")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("plan-from", () => {
  test("writes phases into PROJECT_MEMORY.md", () => {
    const root = tmpRoot("plan")
    try {
      writeFileSync(
        join(root, "idea.md"),
        ["# App", "", "## Auth", "Login flow", "", "## API", "REST endpoints", "", "## UI", "Dashboard"].join("\n"),
        "utf-8",
      )
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "plan-demo" }), "utf-8")
      const result = planFromIdea(root, "idea.md")
      expect(result.phases.length).toBeGreaterThanOrEqual(3)
      const mem = readFileSync(join(root, "PROJECT_MEMORY.md"), "utf-8")
      expect(mem).toContain("## Phases")
      expect(mem).toContain("Auth")
      expect(mem).toContain("- [ ]")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("doctor + frontmatter", () => {
  test("generated AGENTS.md starts with frontmatter", () => {
    const cfg = parseSource("universal-agent.yaml")
    const out = generate(cfg)
    expect(out.content.startsWith("---\n")).toBe(true)
    expect(out.content).toContain("description:")
    expect(out.content).toContain("tags:")
  })

  test("doctor scores a prepared project", () => {
    const root = tmpRoot("doctor")
    try {
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "doc", scripts: { test: "echo" } }), "utf-8")
      writeFileSync(
        join(root, "universal-agent.yaml"),
        [
          "project:",
          '  name: "Doc"',
          "  stack:",
          "    languages: [typescript]",
          "agent_loop:",
          "  enabled: true",
          "multi_agent:",
          "  memory:",
          "    enabled: true",
          '    canonical_file: "PROJECT_MEMORY.md"',
          "",
        ].join("\n"),
        "utf-8",
      )
      writeFileSync(
        join(root, "AGENTS.md"),
        "---\ndescription: \"x\"\n---\n\n## Agent Loop\n\n### Autonomous phased delivery\n\n",
        "utf-8",
      )
      writeFileSync(join(root, "PROJECT_MEMORY.md"), "# Mem\n\n## Phases\n\n- [ ] A\n", "utf-8")
      writeFileSync(join(root, "idea.md"), "# Idea\n\n## Goal\n\nBuild it\n", "utf-8")
      syncAdapters(root, { force: true })
      const report = runDoctor(root)
      expect(report.score).toBe(report.max)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
