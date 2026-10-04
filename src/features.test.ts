import { describe, expect, test } from "bun:test"
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { syncAdapters, buildAdapters } from "./adapters.ts"
import { adoptProject, appendAdoptInstructions } from "./adopt.ts"
import { planFromIdea, upsertPhasesSection } from "./plan-from.ts"
import { runDoctor } from "./doctor.ts"
import { generate } from "./generator.ts"
import { parseSource } from "./parser.ts"
import { ensureIdeaFile, loopStartPrompt, writeStartPromptFile } from "./idea-template.ts"
import { ensureCanonicalMemory, CANONICAL_MEMORY_FILE } from "./memory.ts"
import { detectProject } from "./detector.ts"
import { runUpgrade } from "./upgrade.ts"

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

  test("appends into YAML without universal_instructions key (no duplicate)", () => {
    const raw = ['project:', '  name: "X"', "agent_loop:", "  enabled: true", ""].join("\n")
    const next = appendAdoptInstructions(raw, "\n# --- adopted ---\nKeep secrets out\n")
    const matches = next.match(/^universal_instructions\s*:/gm) ?? []
    expect(matches.length).toBe(1)
    expect(next).toContain("Keep secrets out")
  })

  test("injects into folded > scalar without duplicating key", () => {
    const raw = ["universal_instructions: >", "  Base rule", ""].join("\n")
    const next = appendAdoptInstructions(raw, "\nAdopted line\n")
    expect((next.match(/^universal_instructions\s*:/gm) ?? []).length).toBe(1)
    expect(next).toContain("Adopted line")
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
      expect(result.skipped).toBe(false)
      expect(result.phases.length).toBeGreaterThanOrEqual(3)
      const mem = readFileSync(join(root, "PROJECT_MEMORY.md"), "utf-8")
      expect(mem).toContain("## Phases")
      expect(mem).toContain("Auth")
      expect(mem).toContain("- [ ]")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("skips unfilled idea template instead of fake Goal/Must have phases", () => {
    const root = tmpRoot("plan-empty")
    try {
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "empty-idea" }), "utf-8")
      const created = ensureIdeaFile(root)
      expect(created.created).toBe(true)
      const before = "# Project memory\n\n## Phases\n\n- [ ] Keep me\n"
      writeFileSync(join(root, CANONICAL_MEMORY_FILE), before, "utf-8")
      const result = planFromIdea(root, "idea.md")
      expect(result.skipped).toBe(true)
      expect(result.phases).toEqual([])
      expect(readFileSync(join(root, CANONICAL_MEMORY_FILE), "utf-8")).toBe(before)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("skips Constraints and Notes body even when filled", () => {
    const root = tmpRoot("plan-constraints")
    try {
      writeFileSync(
        join(root, "idea.md"),
        [
          "# Project idea",
          "",
          "Describe what you want to build.",
          "",
          "## Goal",
          "",
          "Ship a stable ComfyUI portable setup.",
          "",
          "## Must have",
          "",
          "1. Launcher adaptativo con flags seguros",
          "2. Indice.md y plan sincronizados",
          "3. Pipelines documentados en docs/",
          "",
          "## Nice to have",
          "",
          "- Perfiles LTX dinamicos por VRAM",
          "",
          "## Constraints",
          "",
          "- Stack / language (if known): Python, ComfyUI, PyTorch",
          "- Do not use: rutas absolutas de maquina",
          "- Deadline / scope limits: solo reparar setup esta sesion",
          "",
          "## Notes",
          "",
          "- Arranque: run_nvidia_gpu.bat",
          "- Toolkit Universal_Loop_Agent/ no es codigo de producto",
          "",
        ].join("\n"),
        "utf-8",
      )
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "comfy-phases" }), "utf-8")
      const result = planFromIdea(root, "idea.md")
      expect(result.skipped).toBe(false)
      expect(result.phases.length).toBe(4)
      expect(result.phases.some((p) => /Launcher/i.test(p))).toBe(true)
      expect(result.phases.some((p) => /Indice/i.test(p))).toBe(true)
      expect(result.phases.some((p) => /LTX/i.test(p))).toBe(true)
      expect(result.phases.some((p) => /Stack\s*\/\s*language/i.test(p))).toBe(false)
      expect(result.phases.some((p) => /Do not use/i.test(p))).toBe(false)
      expect(result.phases.some((p) => /Deadline/i.test(p))).toBe(false)
      expect(result.phases.some((p) => /run_nvidia_gpu/i.test(p))).toBe(false)
      expect(result.phases.some((p) => /Universal_Loop_Agent/i.test(p))).toBe(false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("upsertPhasesSection keeps text containing z and following sections", () => {
    const memory = [
      "# Mem",
      "",
      "## Phases",
      "",
      "- [ ] Old",
      "",
      "## Open items",
      "",
      "Authorize deploy",
      "",
    ].join("\n")
    const next = upsertPhasesSection(memory, ["Authorize users", "API zone"], "idea.md")
    expect(next).toContain("- [ ] Authorize users")
    expect(next).toContain("- [ ] API zone")
    expect(next).toContain("## Open items")
    expect(next).toContain("Authorize deploy")
    expect(next).not.toMatch(/ze\.\.\.|zeOpen/)
  })

  test("resolves idea path relative to target (setup-all argv shape)", () => {
    const root = tmpRoot("plan-rel")
    try {
      writeFileSync(
        join(root, "idea.md"),
        ["# App", "", "## Authorize", "Users", "", "## API zone", "REST"].join("\n"),
        "utf-8",
      )
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "plan-rel" }), "utf-8")
      const result = planFromIdea(root, "idea.md")
      expect(result.phases.some((p) => /Authorize/i.test(p))).toBe(true)
      const mem = readFileSync(join(root, CANONICAL_MEMORY_FILE), "utf-8")
      expect(mem).toContain("Authorize")
      expect(mem).toContain("API zone")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("memory migrate", () => {
  test("ensureCanonicalMemory renames MEMORIA_PROYECTO before seed; prune keeps content", () => {
    const root = tmpRoot("mem-migrate")
    try {
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "mig" }), "utf-8")
      writeFileSync(join(root, "MEMORIA_PROYECTO.md"), "# Real handoff\n\nKeep this content\n", "utf-8")
      const project = detectProject(root)
      ensureCanonicalMemory(root, project)
      expect(existsSync(join(root, "MEMORIA_PROYECTO.md"))).toBe(false)
      expect(existsSync(join(root, CANONICAL_MEMORY_FILE))).toBe(true)
      expect(readFileSync(join(root, CANONICAL_MEMORY_FILE), "utf-8")).toContain("Keep this content")

      writeFileSync(
        join(root, "universal-agent.yaml"),
        [
          "project:",
          '  name: "mig"',
          "  stack:",
          "    languages: [typescript]",
          "multi_agent:",
          "  memory:",
          "    enabled: true",
          '    canonical_file: "PROJECT_MEMORY.md"',
          "agent_loop:",
          "  enabled: true",
          "",
        ].join("\n"),
        "utf-8",
      )
      // Simulate leftover legacy after migrate (should not happen) — content already in canonical
      runUpgrade(root, { dryRun: false, yes: true, prune: true, batchSize: 50 })
      expect(readFileSync(join(root, CANONICAL_MEMORY_FILE), "utf-8")).toContain("Keep this content")
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
