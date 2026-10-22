import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
  copyFileSync,
} from "node:fs"
import { basename, dirname, join, relative, resolve } from "node:path"
import { detectProject } from "./detector.ts"
import { ensureMemory, CANONICAL_MEMORY_FILE, LEGACY_CANONICAL_MEMORY_FILE } from "./memory.ts"
import { generate } from "./generator.ts"
import { parseSource } from "./parser.ts"
import { readTextFile } from "./fs-util.ts"
import { CHANGE_CONTROL_FILE } from "./change-control.ts"
import { removeObsoleteStartPromptFile } from "./idea-template.ts"

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

/** Diary files where historical mentions of legacy names must be kept. */
const CONTENT_SENSITIVE_DIARIES = new Set([
  CANONICAL_MEMORY_FILE,
  LEGACY_CANONICAL_MEMORY_FILE,
  CHANGE_CONTROL_FILE,
  "CONTROL_CAMBIOS.md",
])

/** Directory names that look like frozen release / archive payloads. */
export const DEFAULT_EXCLUDED_DIR_NAMES = new Set([
  "releases",
  "release",
  "archives",
  "archive",
  "_archive",
  "backups",
  "backup",
  "snapshots",
  "mnt",
  "storage",
])

/** Host-editor markers under .uagent/ — never delete or rewrite. */
export function isHostMarkerName(name: string): boolean {
  return /\.stamp$/i.test(name) || name.toLowerCase() === "regla19.stamp"
}

export function isFrozenPayloadDir(name: string): boolean {
  if (DEFAULT_EXCLUDED_DIR_NAMES.has(name.toLowerCase())) return true
  return /(\d{4}-\d{2}-\d{2})|(_v\d+\.\d+)|(-\d{4}-\d{2}-\d{2})/.test(name)
}

/** True when `root` is the uagent toolkit itself (do not auto-migrate). */
export function isToolkitRoot(root: string): boolean {
  const hasEntry = existsSync(join(root, "setup-all.bat")) || existsSync(join(root, "setup-all.ps1"))
  const hasCli = existsSync(join(root, "src", "cli.ts"))
  if (!hasEntry || !hasCli) return false
  const pkgPath = join(root, "package.json")
  if (!existsSync(pkgPath)) return true
  try {
    const raw = readTextFile(pkgPath) ?? readFileSync(pkgPath, "utf-8")
    return /"name"\s*:\s*"uagent"/i.test(raw)
  } catch {
    return true
  }
}

function hasSubstance(text: string): boolean {
  const trimmed = text.replace(/\r\n/g, "\n").trim()
  if (trimmed.length < 40) return false
  // Seed/placeholder heuristics
  if (/_List what is open/i.test(trimmed) && /_After each substantive delivery/i.test(trimmed)) {
    return trimmed.length > 600
  }
  return trimmed.length >= 80
}

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
    id: "change-control-en",
    kind: "file_rename",
    from: "CONTROL_CAMBIOS.md",
    to: "CHANGE_CONTROL.md",
    description: "Change register filename (Spanish → English)",
  },
  {
    id: "token-change-control",
    kind: "token",
    from: "CONTROL_CAMBIOS.md",
    to: "CHANGE_CONTROL.md",
    description: "String references to the legacy change register",
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
  /**
   * @deprecated Prefer rename-only migrations. Deletes are off unless `allowDeletes` is true.
   * See docs/file-lifecycle.md — create / update / rename; never delete.
   */
  prune?: boolean
  /**
   * Required together with `prune` to actually unlink legacy files.
   * Without this flag, prune requests are ignored and a warning is recorded.
   */
  allowDeletes?: boolean
  batchSize?: number
  regenerateAgents?: boolean
  skipMemorySync?: boolean
}

/** Effective prune: only when both prune and allowDeletes are set. */
export function effectivePrune(opts: UpgradeOptions): boolean {
  return Boolean(opts.prune && opts.allowDeletes)
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

function shouldSkipDir(
  name: string,
  fullPath: string,
  excludePaths: Set<string>,
  root: string,
): boolean {
  if (SKIP_DIR_NAMES.has(name)) return true
  if (isFrozenPayloadDir(name)) return true
  if (isNestedToolkitDir(fullPath, name)) return true
  const rel = relative(root, fullPath).replace(/\\/g, "/")
  if (excludePaths.has(rel) || excludePaths.has(name)) return true
  for (const ex of excludePaths) {
    if (rel === ex || rel.startsWith(ex.replace(/\/?$/, "/") )) return true
  }
  return false
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
      const raw = readTextFile(pkgPath) ?? readFileSync(pkgPath, "utf-8")
      if (/"name"\s*:\s*"uagent"/i.test(raw)) return true
    }
    return true
  } catch {
    return false
  }
}

function loadExcludePaths(root: string): Set<string> {
  const out = new Set<string>()
  const yamlPath = join(root, "universal-agent.yaml")
  if (!existsSync(yamlPath)) return out
  try {
    const cfg = parseSource(yamlPath)
    for (const p of cfg.tool?.exclude_paths ?? []) {
      out.add(p.replace(/\\/g, "/").replace(/^\.\//, ""))
    }
  } catch {
    /* ignore */
  }
  return out
}

function isExcludedRel(rel: string, excludePaths: Set<string>): boolean {
  const n = rel.replace(/\\/g, "/")
  if (excludePaths.has(n)) return true
  for (const ex of excludePaths) {
    const prefix = ex.replace(/\/?$/, "/")
    if (n.startsWith(prefix) || n === ex) return true
  }
  // Never rewrite host stamps
  if (n.startsWith(".uagent/") && isHostMarkerName(basename(n))) return true
  return false
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
  const base = basename(n)
  // Diaries keep historical mentions on purpose — not critical leftovers
  if (CONTENT_SENSITIVE_DIARIES.has(base)) return false
  if (n === "universal-agent.yaml" || n === "AGENTS.md" || n === ".cursorrules") return true
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
  excludePaths?: Set<string>,
): { allFiles: string[]; textFiles: string[]; batches: number } {
  const excludes = excludePaths ?? loadExcludePaths(root)
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
        if (shouldSkipDir(name, full, excludes, root)) continue
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
  const warnings: string[] = []
  const renames: RenameAction[] = []
  const refHits: RefHit[] = []
  const tokens: Array<{ from: string; to: string }> = []
  const seenToken = new Set<string>()

  if (isToolkitRoot(resolved)) {
    warnings.push(
      "This is the uagent toolkit itself - it keeps legacy names by design (migration table lives here)",
    )
    return {
      root: resolved,
      phases: ["discover", "plan", "done"],
      renames: [],
      refHits: [],
      tokens: [],
      warnings,
    }
  }

  const excludes = loadExcludePaths(resolved)
  const { allFiles, textFiles } = discoverFiles(resolved, batchSize, excludes)
  const prune = effectivePrune(opts)

  if (opts.prune && !opts.allowDeletes) {
    warnings.push(
      "POLICY: --prune ignored without --i-accept-deletes. Canon is create / update / rename only — never delete (see docs/file-lifecycle.md).",
    )
  }

  for (const m of MIGRATIONS) {
    if (m.kind === "file_rename") {
      const sources = findFilesNamed(allFiles, m.from)
      for (const fromRel of sources) {
        if (isExcludedRel(fromRel, excludes)) {
          warnings.push(`Skipped excluded path ${fromRel}`)
          continue
        }
        const toRel = join(dirname(fromRel), m.to).replace(/\\/g, "/")
        const toPath = join(resolved, toRel)
        if (existsSync(toPath)) {
          const fromText = readTextFile(join(resolved, fromRel)) ?? ""
          const toText = readTextFile(toPath) ?? ""
          const fromHas = hasSubstance(fromText)
          const toHas = hasSubstance(toText)

          if (fromHas && toHas) {
            renames.push({
              migrationId: m.id,
              fromPath: fromRel,
              toPath: toRel,
              mode: "skip_both_exist",
            })
            warnings.push(
              `Both ${fromRel} and ${toRel} have substance — keep both; merge manually (never auto-delete)`,
            )
          } else if (fromHas && !toHas) {
            // Promote only on apply (dryRun === false). Plan/dry-run never writes.
            if (opts.dryRun === false) {
              const backup = `${toRel}.replaced-backup`
              try {
                copyFileSync(toPath, join(resolved, backup))
              } catch {
                /* ignore */
              }
              writeFileSync(toPath, fromText, "utf-8")
              warnings.push(`Promoted substance from ${fromRel} → ${toRel} (backup ${backup})`)
            } else {
              warnings.push(`Would promote substance from ${fromRel} → ${toRel}`)
            }
            // After promote, still never delete the legacy name unless allowDeletes
            if (prune) {
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
            }
          } else if (prune) {
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
              `Both ${fromRel} and ${toRel} exist — keep both; refs rewrite to ${m.to}. Do not use --prune; delete legacy by hand only if sure.`,
            )
          }
        } else {
          // Legacy name only → rename (never copy+delete)
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
      const hits = scanTokenReferences(resolved, textFiles, m.from, m.to, batchSize).filter(
        (h) => !isExcludedRel(h.file, excludes),
      )
      refHits.push(...hits)
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
): { updated: string[]; keptHistorical: string[] } {
  const updated: string[] = []
  const keptHistorical: string[] = []
  const files = [...new Set(plan.refHits.map((h) => h.file))]
  const excludes = loadExcludePaths(root)

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize)
    for (const rel of batch) {
      if (isExcludedRel(rel, excludes)) continue

      // If this file was renamed in the same run, path may have changed
      let abs = join(root, rel)
      let outRel = rel
      if (!existsSync(abs)) {
        const mapped = plan.renames.find((r) => r.fromPath === rel && r.mode === "rename")
        if (mapped) {
          abs = join(root, mapped.toPath)
          outRel = mapped.toPath
        } else continue
      }

      const base = basename(outRel)
      const isDiary = CONTENT_SENSITIVE_DIARIES.has(base)

      let raw: string
      try {
        raw = readFileSync(abs, "utf-8")
      } catch {
        continue
      }

      if (isDiary) {
        // Keep historical mentions of legacy names inside diaries (idempotent history)
        for (const t of plan.tokens) {
          if (raw.includes(t.from)) {
            keptHistorical.push(`kept historical mention of ${t.from} in ${outRel}`)
          }
        }
        continue
      }

      const { content, changed } = replaceAllTokens(raw, plan.tokens)
      if (!changed) continue
      outRel = relative(root, abs).replace(/\\/g, "/")
      if (dryRun) {
        updated.push(outRel)
        continue
      }
      writeFileSync(abs, content, "utf-8")
      updated.push(outRel)
    }
  }

  return { updated, keptHistorical }
}

function verifyUpgrade(root: string, plan: UpgradePlan): UpgradeReport["verify"] {
  const messages: string[] = []
  const leftoverLegacy: string[] = []
  const legacyNames = [...new Set(MIGRATIONS.filter((m) => m.kind === "file_rename").map((m) => m.from))]

  const { allFiles, textFiles } = discoverFiles(root, 500)

  // Intentional keep-both (rename-only policy): leftover legacy filenames are WARN, not FAIL
  const skippedKeep = new Set(
    plan.renames.filter((r) => r.mode === "skip_both_exist").map((r) => r.fromPath.replace(/\\/g, "/")),
  )

  for (const name of legacyNames) {
    const still = findFilesNamed(allFiles, name)
    for (const f of still) {
      const norm = f.replace(/\\/g, "/")
      if (skippedKeep.has(norm) || skippedKeep.has(f)) {
        messages.push(`warn: legacy file kept by policy (rename-only): ${f}`)
        continue
      }
      leftoverLegacy.push(f)
    }
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
  const plan = buildUpgradePlan(root, { ...opts, dryRun })
  phasesCompleted.push("discover", "plan")

  const applied = {
    renames: [] as string[],
    filesUpdated: [] as string[],
    pruned: [] as string[],
    memorySynced: false,
    agentsRegenerated: false,
  }

  // Toolkit root: no writes
  if (plan.renames.length === 0 && plan.refHits.length === 0 && plan.warnings.some((w) => w.includes("toolkit itself"))) {
    phasesCompleted.push("done")
    const report: UpgradeReport = {
      version: "1.1.0",
      root,
      startedAt,
      finishedAt: new Date().toISOString(),
      dryRun,
      phasesCompleted,
      plan,
      applied,
      verify: {
        ok: true,
        leftoverLegacy: [],
        messages: ["Toolkit root — no auto-migration applied"],
      },
    }
    return { report, plan }
  }

  // Phase apply renames
  const renameResult = applyRenames(root, plan.renames, dryRun)
  applied.renames = renameResult.applied
  applied.pruned = renameResult.pruned
  phasesCompleted.push("apply_renames")

  // Phase apply refs (re-scan after renames so moved files get updates)
  if (!dryRun && plan.renames.some((r) => r.mode === "rename")) {
    const refreshed = buildUpgradePlan(root, { ...opts, prune: opts.prune, dryRun })
    plan.refHits = refreshed.refHits
  }
  const refResult = applyRefRewrites(root, plan, dryRun, batchSize)
  applied.filesUpdated = refResult.updated
  for (const msg of refResult.keptHistorical) {
    if (!plan.warnings.includes(msg)) plan.warnings.push(msg)
  }
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

  // Retired paste file: once AGENTS.md exists (or was just regenerated), drop it
  if (!dryRun && existsSync(join(root, "AGENTS.md"))) {
    removeObsoleteStartPromptFile(root)
  }

  // Phase verify — diary leftovers are non-fatal (historical mentions kept on purpose)
  const verify = dryRun
    ? {
        ok: true,
        leftoverLegacy: [] as string[],
        messages: ["dry-run — verify skipped (no writes)"],
      }
    : verifyUpgrade(root, plan)
  phasesCompleted.push("verify", "done")

  const report: UpgradeReport = {
    version: "1.1.0",
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
