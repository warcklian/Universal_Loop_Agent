import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import {
  MANDATED_RULES,
  missingContractRules,
} from "./loop-defaults.ts"
import { CANONICAL_MEMORY_FILE } from "./memory.ts"
import { parseSource } from "./parser.ts"
import { readTextFile } from "./fs-util.ts"

export type ReconcileStatus = "missing" | "outdated" | "current"

export interface ReconcileReport {
  root: string
  status: ReconcileStatus
  missing: string[]
  staleHeuristics: string[]
  briefPath: string
  canonicalMemory: string
}

function detectStaleHeuristics(body: string): string[] {
  const notes: string[] = []
  const lower = body.toLowerCase()
  if (lower.includes("stop and ask") && !lower.includes("report once at the end")) {
    notes.push('Says "stop and ask" but missing "report once at the end"')
  }
  if (lower.includes("ask the user") && !lower.includes("once, upfront") && !lower.includes("one upfront")) {
    notes.push('Says "ask the user" but missing batched "once, upfront" blocker request')
  }
  return notes
}

function resolveCanonical(root: string): string {
  const yamlPath = join(root, "universal-agent.yaml")
  if (existsSync(yamlPath)) {
    try {
      const cfg = parseSource(yamlPath)
      return cfg.multi_agent?.memory?.canonical_file || CANONICAL_MEMORY_FILE
    } catch {
      /* fall through */
    }
  }
  return CANONICAL_MEMORY_FILE
}

function buildBrief(report: ReconcileReport): string {
  const lines = [
    "# AGENTS reconcile brief (for the AI — not a human checklist)",
    "",
    `Status: **${report.status}**`,
    `Canonical memory: \`${report.canonicalMemory}\``,
    "",
    "## Instructions",
    "",
    "1. Read `AGENTS.md`, `universal-agent.yaml`, and the canonical memory file.",
    "2. Apply any missing mandated rules below into the **YAML** loop rules (then regenerate), without asking the user to paste them.",
    "3. Do not delete project-specific rules already present.",
    "4. If YAML and AGENTS.md disagree, fix YAML and regenerate — do not hand-edit AGENTS.md as source of truth.",
    "5. Do not delete host-only markers under `.uagent/` (e.g. `*.stamp`).",
    "6. Do not move handoff out of the canonical memory file into editor profile rules.",
    "7. Nested `Universal_Loop_Agent/` (or uagent toolkit) is the toolkit, not application product code.",
    "8. Report a short summary of AGENTS.md / YAML changes when done.",
    "",
    "## Missing mandated rules",
    "",
  ]
  if (!report.missing.length) {
    lines.push("_None — contract present._")
  } else {
    for (const rule of report.missing) {
      lines.push(`- ${rule}`)
    }
  }
  lines.push("")
  lines.push("## Stale heuristics")
  lines.push("")
  if (!report.staleHeuristics.length) {
    lines.push("_None detected._")
  } else {
    for (const s of report.staleHeuristics) lines.push(`- ${s}`)
  }
  lines.push("")
  lines.push("## Full mandated contract (reference)")
  lines.push("")
  for (const rule of MANDATED_RULES) {
    lines.push(`- ${rule}`)
  }
  lines.push("")
  return lines.join("\n")
}

/**
 * Compare project AGENTS.md against MANDATED_RULES and write a reconcile brief.
 */
export function runReconcile(targetDir: string): ReconcileReport {
  const root = resolve(targetDir)
  const agentsPath = join(root, "AGENTS.md")
  const canonicalMemory = resolveCanonical(root)
  const body = existsSync(agentsPath) ? (readTextFile(agentsPath) ?? "") : ""

  const missing = body.trim() ? missingContractRules(body) : [...MANDATED_RULES]
  const staleHeuristics = body.trim() ? detectStaleHeuristics(body) : ["AGENTS.md missing"]

  let status: ReconcileStatus = "current"
  if (!existsSync(agentsPath) || !body.trim()) status = "missing"
  else if (missing.length || staleHeuristics.length) status = "outdated"

  const uagentDir = join(root, ".uagent")
  if (!existsSync(uagentDir)) mkdirSync(uagentDir, { recursive: true })
  const briefPath = join(uagentDir, "AGENTS_RECONCILE.md")

  const report: ReconcileReport = {
    root,
    status,
    missing,
    staleHeuristics,
    briefPath,
    canonicalMemory,
  }

  writeFileSync(briefPath, buildBrief(report), "utf-8")
  return report
}

export function formatReconcileReport(report: ReconcileReport): string {
  const lines = [
    `\n  uagent reconcile`,
    `  Root: ${report.root}`,
    `  Status: ${report.status}`,
    `  Canonical: ${report.canonicalMemory}`,
    `  Missing rules: ${report.missing.length}`,
    `  Stale heuristics: ${report.staleHeuristics.length}`,
    `  Brief: .uagent/AGENTS_RECONCILE.md`,
    "",
  ]
  if (report.missing.length) {
    lines.push("  Missing:")
    for (const m of report.missing.slice(0, 8)) lines.push(`    - ${m}`)
    if (report.missing.length > 8) lines.push(`    … and ${report.missing.length - 8} more`)
    lines.push("")
  }
  return lines.join("\n")
}
