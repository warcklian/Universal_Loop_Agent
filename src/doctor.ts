import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { parseSource } from "./parser.ts"

export interface DoctorCheck {
  id: string
  ok: boolean
  detail: string
}

export interface DoctorReport {
  root: string
  score: number
  max: number
  checks: DoctorCheck[]
}

function check(id: string, ok: boolean, detail: string): DoctorCheck {
  return { id, ok, detail }
}

/**
 * Portable readiness score for loop + memory duo (no network, no absolute paths required).
 */
export function runDoctor(targetDir: string): DoctorReport {
  const root = resolve(targetDir)
  const checks: DoctorCheck[] = []

  const yamlPath = join(root, "universal-agent.yaml")
  const agentsPath = join(root, "AGENTS.md")
  const memoryPath = join(root, "PROJECT_MEMORY.md")

  checks.push(check("yaml", existsSync(yamlPath), existsSync(yamlPath) ? "universal-agent.yaml present" : "missing universal-agent.yaml — run init/adopt"))
  checks.push(check("agents", existsSync(agentsPath), existsSync(agentsPath) ? "AGENTS.md present" : "missing AGENTS.md — run generate"))
  checks.push(check("memory", existsSync(memoryPath), existsSync(memoryPath) ? "PROJECT_MEMORY.md present" : "missing PROJECT_MEMORY.md — run init"))

  if (existsSync(yamlPath)) {
    try {
      const cfg = parseSource(yamlPath)
      checks.push(check("yaml_valid", true, `YAML valid: ${cfg.project.name}`))
      checks.push(
        check(
          "loop_enabled",
          cfg.agent_loop?.enabled !== false,
          cfg.agent_loop?.enabled === false ? "agent_loop.enabled is false" : "agent loop configured",
        ),
      )
      const canonical = cfg.multi_agent?.memory?.canonical_file ?? "PROJECT_MEMORY.md"
      checks.push(
        check(
          "canonical_memory",
          canonical === "PROJECT_MEMORY.md" || existsSync(join(root, canonical)),
          `canonical_file=${canonical}`,
        ),
      )
    } catch (e) {
      checks.push(check("yaml_valid", false, `YAML invalid: ${(e as Error).message}`))
    }
  }

  if (existsSync(agentsPath)) {
    const body = readFileSync(agentsPath, "utf-8")
    checks.push(
      check(
        "loop_section",
        /## Agent Loop/i.test(body) && /Autonomous phased delivery/i.test(body),
        /Autonomous phased delivery/i.test(body)
          ? "AGENTS.md includes autonomous phased delivery"
          : "AGENTS.md missing autonomous loop section — regenerate",
      ),
    )
    checks.push(
      check("frontmatter", /^---\r?\n/.test(body), /^---\r?\n/.test(body) ? "optional frontmatter present" : "no frontmatter (optional)"),
    )
  }

  const adapters = ["CLAUDE.md", ".github/copilot-instructions.md", ".gemini/settings.json"]
  const adapterHits = adapters.filter((p) => existsSync(join(root, p))).length
  checks.push(
    check(
      "adapters",
      adapterHits >= 2,
      adapterHits >= 2
        ? `multi-editor adapters present (${adapterHits}/${adapters.length})`
        : `few adapters (${adapterHits}/${adapters.length}) — run sync / generate --adapters`,
    ),
  )

  if (existsSync(memoryPath)) {
    const mem = readFileSync(memoryPath, "utf-8")
    checks.push(
      check(
        "phases",
        /## Phases/i.test(mem),
        /## Phases/i.test(mem) ? "PROJECT_MEMORY.md has Phases section" : "no Phases section — run plan-from <idea> or setup-all.bat",
      ),
    )
  }

  const ideaNames = ["idea.md", "IDEA.md", "plan.md", "PLAN.md", "idea.txt"]
  const hasIdea = ideaNames.some((n) => existsSync(join(root, n)))
  checks.push(
    check(
      "idea",
      hasIdea,
      hasIdea ? "idea/plan file present" : "missing idea.md — run setup-all.bat (creates template) or add idea.md",
    ),
  )

  const pkgPath = join(root, "package.json")
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { scripts?: Record<string, string> }
      checks.push(
        check(
          "test_script",
          Boolean(pkg.scripts?.test),
          pkg.scripts?.test ? "package.json has test script" : "no test script (optional but recommended)",
        ),
      )
    } catch {
      checks.push(check("test_script", false, "package.json unreadable"))
    }
  }

  const scored = checks.filter((c) => c.id !== "frontmatter")
  const required = scored.filter((c) => c.id !== "test_script" || existsSync(pkgPath))
  const okCount = required.filter((c) => c.ok).length

  return {
    root,
    score: okCount,
    max: required.length,
    checks,
  }
}

const DOCTOR_TIPS: Record<string, string> = {
  yaml: "Fix: run setup-all.bat (or uagent init) in the toolkit folder",
  agents: "Fix: run setup-all.bat (or uagent generate --force --adapters)",
  memory: "Fix: run setup-all.bat (or uagent init)",
  yaml_valid: "Fix: open universal-agent.yaml and repair YAML syntax, then setup-all.bat",
  loop_enabled: "Fix: set agent_loop.enabled: true in universal-agent.yaml, then regenerate",
  loop_section: "Fix: re-run setup-all.bat to regenerate AGENTS.md with loop rules",
  adapters: "Fix: setup-all.bat or uagent sync --force",
  phases: "Fix: add idea.md then setup-all.bat (runs plan-from)",
  idea: "Fix: setup-all.bat creates idea.md from template — edit it and re-run",
  test_script: "Optional: add a test script to package.json for stronger phase DoD",
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines = [
    `\n  uagent doctor`,
    `  Root: ${report.root}`,
    `  Score: ${report.score}/${report.max}`,
    "",
  ]
  for (const c of report.checks) {
    lines.push(`  ${c.ok ? "[OK]" : "[!!]"} ${c.id}: ${c.detail}`)
    if (!c.ok && DOCTOR_TIPS[c.id]) {
      lines.push(`       → ${DOCTOR_TIPS[c.id]}`)
    }
  }
  lines.push("")
  return lines.join("\n")
}
