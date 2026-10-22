import { existsSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"
import { parseSource } from "./parser.ts"
import { CHANGE_CONTROL_FILE } from "./change-control.ts"
import { readJsonFile, readTextFile } from "./fs-util.ts"
import { missingContractRules } from "./loop-defaults.ts"
import { isHostMarkerName } from "./upgrade.ts"

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
  let canonicalFile = "PROJECT_MEMORY.md"

  checks.push(check("yaml", existsSync(yamlPath), existsSync(yamlPath) ? "universal-agent.yaml present" : "missing universal-agent.yaml — run init/adopt"))
  checks.push(check("agents", existsSync(agentsPath), existsSync(agentsPath) ? "AGENTS.md present" : "missing AGENTS.md — run generate"))

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
      canonicalFile = cfg.multi_agent?.memory?.canonical_file ?? "PROJECT_MEMORY.md"
      const memoryPath = join(root, canonicalFile)
      checks.push(
        check(
          "memory",
          existsSync(memoryPath),
          existsSync(memoryPath)
            ? `${canonicalFile} present`
            : `missing ${canonicalFile} — run init`,
        ),
      )
      checks.push(
        check(
          "canonical_memory",
          canonicalFile === "PROJECT_MEMORY.md" || existsSync(memoryPath),
          `canonical_file=${canonicalFile}`,
        ),
      )
      if (cfg.change_control?.enabled !== false) {
        const registerPath = join(root, cfg.change_control?.file || CHANGE_CONTROL_FILE)
        checks.push(
          check(
            "change_control",
            existsSync(registerPath),
            existsSync(registerPath)
              ? `${cfg.change_control?.file || CHANGE_CONTROL_FILE} present (change register)`
              : `missing ${cfg.change_control?.file || CHANGE_CONTROL_FILE} — run init`,
          ),
        )
      }
    } catch (e) {
      checks.push(check("yaml_valid", false, `YAML invalid: ${(e as Error).message}`))
      const memoryPath = join(root, canonicalFile)
      checks.push(
        check(
          "memory",
          existsSync(memoryPath),
          existsSync(memoryPath) ? `${canonicalFile} present` : `missing ${canonicalFile} — run init`,
        ),
      )
    }
  } else {
    const memoryPath = join(root, canonicalFile)
    checks.push(
      check(
        "memory",
        existsSync(memoryPath),
        existsSync(memoryPath) ? `${canonicalFile} present` : `missing ${canonicalFile} — run init`,
      ),
    )
  }

  if (existsSync(agentsPath)) {
    const body = readTextFile(agentsPath) ?? ""
    checks.push(
      check(
        "loop_section",
        /## Agent Loop/i.test(body) && /Autonomous phased delivery/i.test(body),
        /Autonomous phased delivery/i.test(body)
          ? "AGENTS.md includes autonomous phased delivery"
          : "AGENTS.md missing autonomous loop section — regenerate",
      ),
    )
    const missing = missingContractRules(body)
    checks.push(
      check(
        "contract",
        missing.length === 0,
        missing.length === 0
          ? "AGENTS.md includes autonomous delivery contract"
          : `AGENTS.md missing ${missing.length} mandated rule(s) — run uagent reconcile`,
      ),
    )
    checks.push(
      check("frontmatter", /^---\r?\n/.test(body), /^---\r?\n/.test(body) ? "optional frontmatter present" : "no frontmatter (optional)"),
    )
  }

  // Informational only — does not affect readiness score
  const uagentDir = join(root, ".uagent")
  let hostMarker = false
  if (existsSync(uagentDir)) {
    try {
      hostMarker = readdirSync(uagentDir).some((n) => isHostMarkerName(n))
    } catch {
      hostMarker = false
    }
  }
  checks.push(
    check(
      "host_markers",
      true,
      hostMarker
        ? "host bootstrap marker present (ignored by uagent)"
        : "no host bootstrap marker (optional)",
    ),
  )

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

  const memoryPath = join(root, canonicalFile)
  if (existsSync(memoryPath)) {
    const mem = readTextFile(memoryPath) ?? ""
    checks.push(
      check(
        "phases",
        /## Phases/i.test(mem),
        /## Phases/i.test(mem)
          ? `${canonicalFile} has Phases section`
          : `no Phases section — run plan-from <idea> or setup-all.bat`,
      ),
    )
  }

  const ideaNames = ["idea.md", "IDEA.md", "plan.md", "PLAN.md", "idea.txt"]
  let hasIdea = ideaNames.some((n) => existsSync(join(root, n)))
  let ideaDetail = hasIdea ? "idea/plan file present" : "missing idea.md — run setup-all.bat (creates template) or add idea.md"
  if (!hasIdea) {
    try {
      const hit = readdirSync(root).find(
        (n) => /(^|[_-])(plan|idea)([_-]|\.|$)/i.test(n) && /\.(md|txt)$/i.test(n),
      )
      if (hit) {
        hasIdea = true
        ideaDetail = `idea/plan file present (${hit})`
      }
    } catch {
      /* ignore */
    }
  }
  checks.push(check("idea", hasIdea, ideaDetail))

  const pkgPath = join(root, "package.json")
  if (existsSync(pkgPath)) {
    const pkg = readJsonFile<{ scripts?: Record<string, string> }>(pkgPath)
    if (!pkg) {
      checks.push(check("test_script", false, "package.json unreadable"))
    } else {
      checks.push(
        check(
          "test_script",
          Boolean(pkg.scripts?.test),
          pkg.scripts?.test ? "package.json has test script" : "no test script (optional but recommended)",
        ),
      )
    }
  }

  const scored = checks.filter((c) => c.id !== "frontmatter" && c.id !== "host_markers")
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
  change_control: "Fix: run setup-all.bat (or uagent init) to create the change register",
  loop_section: "Fix: re-run setup-all.bat to regenerate AGENTS.md with loop rules",
  contract: "Fix: uagent reconcile → give .uagent/AGENTS_RECONCILE.md to the AI, then regenerate",
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
