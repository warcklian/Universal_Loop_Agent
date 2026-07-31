import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { basename, dirname, join, relative, resolve } from "node:path"
import { detectProject } from "./detector.ts"
import { ensureMemory } from "./memory.ts"
import { generate } from "./generator.ts"
import { parseSource } from "./parser.ts"

/** Known renames from older uagent versions → current English defaults. */
export interface FileRenameMigration {
  id: string
  kind: "file_rename"
  from: string
  to: string
  description: string
}

/** Extra string tokens that may appear without a file rename (YAML keys, docs). */
export interface TokenMigration {
  id: string
  kind: "token"
  from: string
  to: string
  description: string
}

export type Migration = FileRenameMigration | TokenMigration

export const MIGRATIONS: Migration[] = [
  {
    id: "canonical-memory-en",
    kind: "file_rename",
    from: "MEMORIA_PROYECTO.md",
    to: "PROJECT_MEMORY.md",
    description: "Canonical handoff filename (Spanish → English)",
  },
  {
    id: "agents-loop-filename",
    kind: "file_rename",
    from: "AGENTS_LOOP.md",
    to: "AGENTS.md",
    description: "Legacy generated agents filename",
  },
  {
    id: "token-memoria-proyecto",
    kind: "token",
    from: "MEMORIA_PROYECTO.md",
    to: "PROJECT_MEMORY.md",
    description: "String references to legacy canonical memory",
  },
  {
    id: "token-agents-loop",
    kind: "token",
    from: "AGENTS_LOOP.md",
    to: "AGENTS.md",
    description: "String references to legacy AGENTS_LOOP.md",
  },
]

/**
 * Do not auto-rename Indice.md → Index.md.
 * Consumer projects often keep Indice.md as their navigation map; forcing Index
 * corrupts product docs when the toolkit is nested. New toolkit docs use Index.md.
 */

const SKIP_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "out",
  "coverage",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  "target",
  "build",
])

const TEXT_EXT = new Set([
  ".md",
  ".markdown",
  ".txt",
  ".yaml",
  ".yml",
  ".json",
  ".toml",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".rs",
  ".go",
  ".rb",
  ".php",
  ".java",
  ".kt",
  ".cs",
  ".swift",
  ".sh",
  ".ps1",
  ".bat",
  ".cmd",
  ".html",
  ".css",
  ".scss",
  ".vue",
  ".svelte",
  ".xml",
  ".ini",
  ".cfg",
  ".env",
  ".example",
  ".cursorrules",
  ".gitignore",
  ".editorconfig",
])

const BINARY_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".gz",
  ".7z",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".wasm",
  ".lockb",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp4",
  ".mp3",
  ".jar",
  ".class",
])

export type UpgradePhase =
  | "discover"
  | "plan"
  | "apply_renames"
  | "apply_refs"
  | "sync_memory"
  | "regenerate_agents"
  | "verify"
  | "done"

export interface RenameAction {
  migrationId: string
  fromPath: string
  toPath: string
  mode: "rename" | "skip_both_exist" | "target_exists_drop_source"
}

export interface RefHit {
  file: string
  tokenFrom: string
  tokenTo: string
  occurrences: number
}

export interface UpgradePlan {
  root: string
  phases: UpgradePhase[]
  renames: RenameAction[]
  refHits: RefHit[]
  tokens: Array<{ from: string; to: string }>
  warnings: string[]
}

export interface UpgradeOptions {
  dryRun?: boolean
  yes?: boolean
  prune?: boolean
  batchSize?: number
  regenerateAgents?: boolean
  skipMemorySync?: boolean
}

export interface UpgradeReport {
  version: string
  root: string
  startedAt: string
  finishedAt: string
  dryRun: boolean
  phasesCompleted: UpgradePhase[]
  plan: UpgradePlan
  applied: {
    renames: string[]
    filesUpdated: string[]
    pruned: string[]
    memorySynced: boolean
    agentsRegenerated: boolean
  }
  verify: {
    ok: boolean
    leftoverLegacy: string[]
    messages: string[]
  }
}

function shouldSkipDir(name: string, fullPath: string): boolean {
  if (SKIP_DIR_NAMES.has(name)) return true
  return isNestedToolkitDir(fullPath, name)
}

/** Nested copy of this toolkit must never be rewritten by consumer upgrade. */
export function isNestedToolkitDir(dirPath: string, name: string): boolean {
  const lower = name.toLowerCase().replace(/-/g, "_")
  if (lower === "universal_loop_agent" || lower.includes("universal_loop_agent")) {
    return true
  }
  try {
    const hasEntry = existsSync(join(dirPath, "setup-all.bat")) || existsSync(join(dirPath, "setup-all.ps1"))
    const hasCli = existsSync(join(dirPath, "src", "cli.ts"))
    if (!hasEntry || !hasCli) return false
    const pkgPath = join(dirPath, "package.json")
    if (existsSync(pkgPath)) {
      const raw = readFileSync(pkgPath, "utf-8")
      if (/"name"\s*:\s*"uagent"/i.test(raw)) return true
    }
    return true
  } catch {
    return false
  }
}

function isProbablyTextFile(filePath: string): boolean {
  const base = basename(filePath)
  if (base === ".cursorrules" || base === ".gitignore" || base === ".editorconfig") return true
  const dot = base.lastIndexOf(".")
  if (dot < 0) return false
  const ext = base.slice(dot).toLowerCase()
  if (BINARY_EXT.has(ext)) return false
  return TEXT_EXT.has(ext)
}

function isCriticalRefPath(rel: string): boolean {
  const n = rel.replace(/\\/g, "/")
  if (n === "universal-agent.yaml" || n === "AGENTS.md" || n === ".cursorrules") return true
  if (n === "PROJECT_MEMORY.md" || n === "MEMORIA_PROYECTO.md") return true
  if (n.startsWith(".uagent/memory/")) return true
  return false
}

/**
 * Phase discover: walk project in batches (large-repo safe).
 * Skips heavy dirs; returns relative paths of candidate text files + all files for rename checks.
 */
export function discoverFiles(
  root: string,
  batchSize = 200,
): { allFiles: string[]; textFiles: string[]; batches: number } {
  const allFiles: string[] = []
  const textFiles: string[] = []
  const stack: string[] = [root]
  let batches = 0
  let batchCount = 0

  while (stack.length) {
    const dir = stack.pop()!
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      continue
    }

    for (const name of entries) {
      if (name === "." || name === "..") continue
      const full = join(dir, name)
      let st
      try {
        st = statSync(full)
      } catch {
        continue
      }

      if (st.isDirectory()) {
        if (shouldSkipDir(name, full)) continue
        // Do not descend into .uagent here; memory stubs are scanned below
        if (name === ".uagent") continue
        stack.push(full)
        continue
      }

      if (!st.isFile()) continue
      const rel = relative(root, full).replace(/\\/g, "/")
      allFiles.push(rel)
      batchCount++
      if (batchCount >= batchSize) {
        batches++
        batchCount = 0
      }

      if (isProbablyTextFile(full) || name.endsWith(".md") || name.endsWith(".yaml") || name.endsWith(".yml")) {
        textFiles.push(rel)
      }
    }
  }

  if (batchCount > 0) batches++

  // Always include .uagent/memory text stubs if present
  const memoryRoot = join(root, ".uagent", "memory")
  if (existsSync(memoryRoot)) {
    const memStack = [memoryRoot]
    while (memStack.length) {
      const dir = memStack.pop()!
      let entries: string[]
      try {
        entries = readdirSync(dir)
      } catch {
        continue
      }
      for (const name of entries) {
        const full = join(dir, name)
        let st
        try {
          st = statSync(full)
        } catch {
          continue
        }
        if (st.isDirectory()) {
          memStack.push(full)
          continue
        }
        if (!st.isFile()) continue
        const rel = relative(root, full).replace(/\\/g, "/")
        if (!allFiles.includes(rel)) allFiles.push(rel)
        if (!textFiles.includes(rel)) textFiles.push(rel)
      }
    }
  }

  return { allFiles, textFiles, batches: Math.max(batches, 1) }
}

function findFilesNamed(allFiles: string[], fileName: string): string[] {
  return allFiles.filter((f) => basename(f) === fileName)
}

/**
 * Scan text files for token occurrences in batches.
 */
export function scanTokenReferences(
  root: string,
  textFiles: string[],
  from: string,
  to: string,
  batchSize = 200,
): RefHit[] {
  const hits: RefHit[] = []
  for (let i = 0; i < textFiles.length; i += batchSize) {
    const batch = textFiles.slice(i, i + batchSize)
    for (const rel of batch) {
      // Skip the legacy file itself for rename targets; still update if it becomes the new name later
      const full = join(root, rel)
      let raw: string
      try {
        raw = readFileSync(full, "utf-8")
      } catch {
        continue
      }
      if (!raw.includes(from)) continue
      let count = 0
      let idx = 0
      while ((idx = raw.indexOf(from, idx)) !== -1) {
        count++
        idx += from.length
      }
      if (count > 0) {
        hits.push({ file: rel, tokenFrom: from, tokenTo: to, occurrences: count })
      }
    }
  }
  return hits
}

export function buildUpgradePlan(root: string, opts: UpgradeOptions = {}): UpgradePlan {
  const batchSize = opts.batchSize ?? 200
  const resolved = resolve(root)
  const { allFiles, textFiles } = discoverFiles(resolved, batchSize)
  const warnings: string[] = []
  const renames: RenameAction[] = []
  const refHits: RefHit[] = []
  const tokens: Array<{ from: string; to: string }> = []
  const seenToken = new Set<string>()

  for (const m of MIGRATIONS) {
    if (m.kind === "file_rename") {
      const sources = findFilesNamed(allFiles, m.from)
      for (const fromRel of sources) {
        const fromPath = join(resolved, fromRel)
        const toRel = join(dirname(fromRel), m.to).replace(/\\/g, "/")
        const toPath = join(resolved, toRel)
        if (existsSync(toPath)) {
          if (opts.prune) {
            renames.push({
              migrationId: m.id,
              fromPath: fromRel,
              toPath: toRel,
              mode: "target_exists_drop_source",
            })
          } else {
            renames.push({
              migrationId: m.id,
              fromPath: fromRel,
              toPath: toRel,
              mode: "skip_both_exist",
            })
            warnings.push(
              `Both ${fromRel} and ${toRel} exist — will rewrite refs to ${m.to}; use --prune to remove legacy file`,
            )
          }
        } else {
          renames.push({
            migrationId: m.id,
            fromPath: fromRel,
            toPath: toRel,
            mode: "rename",
          })
        }
      }
    }

    const key = `${m.from}=>${m.to}`
    if (!seenToken.has(key)) {
      seenToken.add(key)
      tokens.push({ from: m.from, to: m.to })
      refHits.push(...scanTokenReferences(resolved, textFiles, m.from, m.to, batchSize))
    }
  }

  return {
    root: resolved,
    phases: [
      "discover",
      "plan",
      "apply_renames",
      "apply_refs",
      "sync_memory",
      "regenerate_agents",
      "verify",
      "done",
    ],
    renames,
    refHits,
    tokens,
    warnings,
  }
}

function replaceAllTokens(content: string, tokens: Array<{ from: string; to: string }>): {
  content: string
  changed: boolean
} {
  let next = content
  let changed = false
  for (const t of tokens) {
    if (!next.includes(t.from)) continue
    next = next.split(t.from).join(t.to)
    changed = true
  }
  return { content: next, changed }
}

function applyRenames(
  root: string,
  renames: RenameAction[],
  dryRun: boolean,
): { applied: string[]; pruned: string[] } {
  const applied: string[] = []
  const pruned: string[] = []

  for (const action of renames) {
    const fromAbs = join(root, action.fromPath)
    const toAbs = join(root, action.toPath)

    if (action.mode === "rename") {
      if (dryRun) {
        applied.push(`rename ${action.fromPath} → ${action.toPath}`)
        continue
      }
      const parent = dirname(toAbs)
      if (!existsSync(parent)) mkdirSync(parent, { recursive: true })
      renameSync(fromAbs, toAbs)
      applied.push(`rename ${action.fromPath} → ${action.toPath}`)
      continue
    }

    if (action.mode === "target_exists_drop_source") {
      if (dryRun) {
        pruned.push(`prune ${action.fromPath} (keep ${action.toPath})`)
        continue
      }
      if (existsSync(fromAbs)) {
        unlinkSync(fromAbs)
        pruned.push(action.fromPath)
      }
      continue
    }

    // skip_both_exist — no filesystem rename
  }

  return { applied, pruned }
}

function applyRefRewrites(
  root: string,
  plan: UpgradePlan,
  dryRun: boolean,
  batchSize: number,
): string[] {
  const updated: string[] = []
  const files = [...new Set(plan.refHits.map((h) => h.file))]

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize)
    for (const rel of batch) {
      // If this file was renamed in the same run, path may have changed
      let abs = join(root, rel)
      if (!existsSync(abs)) {
        // Map through rename actions
        const mapped = plan.renames.find((r) => r.fromPath === rel && r.mode === "rename")
        if (mapped) abs = join(root, mapped.toPath)
        else continue
      }

      let raw: string
      try {
        raw = readFileSync(abs, "utf-8")
      } catch {
        continue
      }
      const { content, changed } = replaceAllTokens(raw, plan.tokens)
      if (!changed) continue
      const outRel = relative(root, abs).replace(/\\/g, "/")
      if (dryRun) {
        updated.push(outRel)
        continue
      }
      writeFileSync(abs, content, "utf-8")
      updated.push(outRel)
    }
  }

  return updated
}

function verifyUpgrade(root: string, plan: UpgradePlan): UpgradeReport["verify"] {
  const messages: string[] = []
  const leftoverLegacy: string[] = []
  const legacyNames = [...new Set(MIGRATIONS.filter((m) => m.kind === "file_rename").map((m) => m.from))]

  const { allFiles, textFiles } = discoverFiles(root, 500)

  for (const name of legacyNames) {
    const still = findFilesNamed(allFiles, name)
    for (const f of still) leftoverLegacy.push(f)
  }

  let criticalTokenHits = 0
  let otherTokenHits = 0
  for (const t of plan.tokens) {
    const hits = scanTokenReferences(root, textFiles, t.from, t.to, 500)
    for (const h of hits) {
      const msg = `${h.file} contains ${t.from} (×${h.occurrences})`
      if (isCriticalRefPath(h.file)) {
        leftoverLegacy.push(msg)
        criticalTokenHits++
      } else {
        messages.push(`warn: ${msg}`)
        otherTokenHits++
      }
    }
  }

  const yamlPath = join(root, "universal-agent.yaml")
  if (existsSync(yamlPath)) {
    try {
      parseSource(yamlPath)
      messages.push("universal-agent.yaml parses OK")
    } catch (e) {
      messages.push(`universal-agent.yaml parse error: ${(e as Error).message}`)
      return { ok: false, leftoverLegacy, messages }
    }
  }

  const ok = leftoverLegacy.length === 0
  if (ok) {
    messages.push("No critical legacy filenames or tokens remaining")
    if (otherTokenHits > 0) {
      messages.push(`${otherTokenHits} non-critical mention(s) remain in docs/history (optional cleanup)`)
    }
  } else {
    messages.push(
      `Found ${leftoverLegacy.length} critical leftover item(s)` +
        (criticalTokenHits ? ` (${criticalTokenHits} token hits in critical paths)` : ""),
    )
  }

  return { ok, leftoverLegacy, messages }
}

function writeReport(root: string, report: UpgradeReport): void {
  const dir = join(root, ".uagent")
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  // Portable: report lives inside the project — never embed absolute machine paths.
  const portable = { ...report, root: "." }
  writeFileSync(join(dir, "upgrade-report.json"), JSON.stringify(portable, null, 2), "utf-8")
}

export interface UpgradeResult {
  report: UpgradeReport
  plan: UpgradePlan
}

/**
 * Adaptive upgrade pipeline. Runs phases sequentially; large repos are scanned in batches.
 */
export function runUpgrade(targetDir: string, opts: UpgradeOptions = {}): UpgradeResult {
  const root = resolve(targetDir)
  const dryRun = Boolean(opts.dryRun)
  const batchSize = opts.batchSize ?? 200
  const startedAt = new Date().toISOString()
  const phasesCompleted: UpgradePhase[] = []

  // Phase discover + plan
  const plan = buildUpgradePlan(root, opts)
  phasesCompleted.push("discover", "plan")

  const applied = {
    renames: [] as string[],
    filesUpdated: [] as string[],
    pruned: [] as string[],
    memorySynced: false,
    agentsRegenerated: false,
  }

  // Phase apply renames
  const renameResult = applyRenames(root, plan.renames, dryRun)
  applied.renames = renameResult.applied
  applied.pruned = renameResult.pruned
  phasesCompleted.push("apply_renames")

  // Phase apply refs (re-scan after renames so moved files get updates)
  if (!dryRun && plan.renames.some((r) => r.mode === "rename")) {
    // Refresh ref hits on post-rename tree for tokens still present
    const refreshed = buildUpgradePlan(root, { ...opts, prune: opts.prune })
    plan.refHits = refreshed.refHits
  }
  applied.filesUpdated = applyRefRewrites(root, plan, dryRun, batchSize)
  phasesCompleted.push("apply_refs")

  // Phase sync memory stubs to current canonical name
  if (!opts.skipMemorySync) {
    if (!dryRun) {
      const project = detectProject(root)
      ensureMemory(root, project)
      applied.memorySynced = true
    } else {
      applied.memorySynced = false
    }
    phasesCompleted.push("sync_memory")
  }

  // Phase regenerate AGENTS.md when YAML exists
  const yamlPath = join(root, "universal-agent.yaml")
  if (opts.regenerateAgents !== false && existsSync(yamlPath)) {
    if (!dryRun) {
      try {
        const config = parseSource(yamlPath)
        const result = generate(config)
        writeFileSync(join(root, result.file), result.content, "utf-8")
        applied.agentsRegenerated = true
      } catch (e) {
        plan.warnings.push(`AGENTS.md regenerate skipped: ${(e as Error).message}`)
      }
    }
    phasesCompleted.push("regenerate_agents")
  }

  // Phase verify
  const verify = dryRun
    ? {
        ok: true,
        leftoverLegacy: [] as string[],
        messages: ["dry-run — verify skipped (no writes)"],
      }
    : verifyUpgrade(root, plan)
  phasesCompleted.push("verify", "done")

  const report: UpgradeReport = {
    version: "1.0.0",
    root,
    startedAt,
    finishedAt: new Date().toISOString(),
    dryRun,
    phasesCompleted,
    plan,
    applied,
    verify,
  }

  if (!dryRun) writeReport(root, report)

  return { report, plan }
}

export function formatUpgradeSummary(result: UpgradeResult): string {
  const { report, plan } = result
  const lines: string[] = []
  lines.push(`\n  uagent upgrade ${report.dryRun ? "(dry-run)" : ""}`)
  lines.push(`  Root: ${report.root}`)
  lines.push(`  Phases: ${report.phasesCompleted.join(" → ")}`)
  lines.push("")

  if (plan.warnings.length) {
    lines.push("  Warnings:")
    for (const w of plan.warnings) lines.push(`    - ${w}`)
    lines.push("")
  }

  lines.push(`  Planned renames: ${plan.renames.length}`)
  for (const r of plan.renames) {
    lines.push(`    - [${r.mode}] ${r.fromPath} → ${r.toPath}`)
  }

  lines.push(`  Reference hits: ${plan.refHits.length} file(s)`)
  for (const h of plan.refHits.slice(0, 30)) {
    lines.push(`    - ${h.file}: ${h.tokenFrom} → ${h.tokenTo} (×${h.occurrences})`)
  }
  if (plan.refHits.length > 30) {
    lines.push(`    … and ${plan.refHits.length - 30} more`)
  }

  lines.push("")
  lines.push(`  Applied renames: ${report.applied.renames.length}`)
  lines.push(`  Files updated:   ${report.applied.filesUpdated.length}`)
  lines.push(`  Pruned:          ${report.applied.pruned.length}`)
  lines.push(`  Memory synced:   ${report.applied.memorySynced}`)
  lines.push(`  AGENTS.md regen: ${report.applied.agentsRegenerated}`)
  lines.push(`  Verify OK:       ${report.verify.ok}`)
  for (const m of report.verify.messages) lines.push(`    · ${m}`)
  if (report.verify.leftoverLegacy.length) {
    lines.push("  Leftover:")
    for (const L of report.verify.leftoverLegacy.slice(0, 20)) lines.push(`    - ${L}`)
  }
  if (!report.dryRun) {
    lines.push(`\n  Report: .uagent/upgrade-report.json\n`)
  } else {
    lines.push(`\n  Dry-run — no report written.\n`)
  }
  return lines.join("\n")
}
