import { describe, expect, test } from "bun:test"
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { buildUpgradePlan, runUpgrade } from "./upgrade.ts"

function makeLegacyProject(tag: string): string {
  const root = join(tmpdir(), `uagent-upgrade-${tag}-${Date.now()}`)
  mkdirSync(join(root, "docs"), { recursive: true })
  mkdirSync(join(root, ".uagent", "memory"), { recursive: true })

  writeFileSync(
    join(root, "MEMORIA_PROYECTO.md"),
    "# Memoria\n\nSee Indice.md and AGENTS_LOOP.md\n",
    "utf-8",
  )
  writeFileSync(join(root, "Indice.md"), "# Indice\n\nTree here\n", "utf-8")
  writeFileSync(
    join(root, "docs", "notes.md"),
    "Read MEMORIA_PROYECTO.md and Indice.md please.\n",
    "utf-8",
  )
  writeFileSync(
    join(root, "universal-agent.yaml"),
    [
      "project:",
      '  name: "Legacy Demo"',
      "  stack:",
      "    languages: [typescript]",
      "multi_agent:",
      "  memory:",
      "    enabled: true",
      '    canonical_file: "MEMORIA_PROYECTO.md"',
      '    path: ".uagent/memory/"',
      "agent_loop:",
      "  enabled: true",
      "  rules:",
      '    - instruction: "Read MEMORIA_PROYECTO.md first"',
      "",
    ].join("\n"),
    "utf-8",
  )
  writeFileSync(
    join(root, ".uagent", "memory", "context.md"),
    "Canonical: MEMORIA_PROYECTO.md\n",
    "utf-8",
  )
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "legacy-demo", scripts: { test: "echo" } }),
    "utf-8",
  )
  writeFileSync(join(root, "bun.lock"), "", "utf-8")

  return root
}

describe("upgrade", () => {
  test("dry-run plans renames and ref hits without moving files", () => {
    const root = makeLegacyProject("dry")
    try {
      const plan = buildUpgradePlan(root, { batchSize: 50 })
      expect(plan.renames.some((r) => r.fromPath.endsWith("MEMORIA_PROYECTO.md"))).toBe(true)
      expect(plan.renames.some((r) => r.fromPath.endsWith("Indice.md"))).toBe(true)
      expect(plan.refHits.length).toBeGreaterThan(0)

      runUpgrade(root, { dryRun: true, yes: true, batchSize: 50 })
      expect(existsSync(join(root, "MEMORIA_PROYECTO.md"))).toBe(true)
      expect(existsSync(join(root, "PROJECT_MEMORY.md"))).toBe(false)
      expect(existsSync(join(root, ".uagent", "upgrade-report.json"))).toBe(false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("apply renames files, rewrites refs, syncs memory, verifies", () => {
    const root = makeLegacyProject("apply")
    try {
      const { report } = runUpgrade(root, {
        dryRun: false,
        yes: true,
        prune: true,
        batchSize: 50,
      })

      expect(existsSync(join(root, "MEMORIA_PROYECTO.md"))).toBe(false)
      expect(existsSync(join(root, "Indice.md"))).toBe(false)
      expect(existsSync(join(root, "PROJECT_MEMORY.md"))).toBe(true)
      expect(existsSync(join(root, "Index.md"))).toBe(true)

      const yaml = readFileSync(join(root, "universal-agent.yaml"), "utf-8")
      expect(yaml).toContain("PROJECT_MEMORY.md")
      expect(yaml).not.toContain("MEMORIA_PROYECTO.md")

      const notes = readFileSync(join(root, "docs", "notes.md"), "utf-8")
      expect(notes).toContain("PROJECT_MEMORY.md")
      expect(notes).toContain("Index.md")
      expect(notes).not.toContain("MEMORIA_PROYECTO.md")
      expect(notes).not.toContain("Indice.md")

      const memory = readFileSync(join(root, "PROJECT_MEMORY.md"), "utf-8")
      expect(memory).not.toContain("MEMORIA_PROYECTO.md")
      expect(memory).not.toContain("Indice.md")

      expect(existsSync(join(root, "AGENTS.md"))).toBe(true)
      expect(existsSync(join(root, ".uagent", "upgrade-report.json"))).toBe(true)
      expect(report.verify.ok).toBe(true)
      expect(report.applied.memorySynced).toBe(true)
      expect(report.applied.agentsRegenerated).toBe(true)
      const saved = JSON.parse(readFileSync(join(root, ".uagent", "upgrade-report.json"), "utf-8")) as {
        root: string
      }
      expect(saved.root).toBe(".")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("when both legacy and new exist, prune removes legacy", () => {
    const root = makeLegacyProject("both")
    writeFileSync(join(root, "PROJECT_MEMORY.md"), "# Already new\n", "utf-8")
    try {
      const { report } = runUpgrade(root, {
        dryRun: false,
        yes: true,
        prune: true,
        batchSize: 50,
      })
      expect(existsSync(join(root, "MEMORIA_PROYECTO.md"))).toBe(false)
      expect(existsSync(join(root, "PROJECT_MEMORY.md"))).toBe(true)
      expect(report.applied.pruned.some((p) => p.includes("MEMORIA_PROYECTO.md"))).toBe(true)
      expect(report.verify.ok).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
