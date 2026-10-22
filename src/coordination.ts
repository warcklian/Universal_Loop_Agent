/**
 * Multi-agent coordination (portable, product-root).
 * Locks: `.uagent/locks/*.json` (TTL, gitignored).
 * Claims: `## Active claims` in the canonical memory file (versioned handoff).
 * See docs/multi-agent-coordination.md.
 */

import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { join, resolve } from "node:path"
import { CANONICAL_MEMORY_FILE } from "./memory.ts"
import { readTextFile } from "./fs-util.ts"

export const DEFAULT_LOCK_TTL_MS = 30 * 60 * 1000
export const LOCKS_DIR = ".uagent/locks"
export const AGENTS_REGISTRY = ".uagent/agents.json"

export interface FileLock {
  file: string
  owner: string
  agentId: string
  phase?: string
  acquiredAt: string
  ttlMs: number
  heartbeatAt: string
}

export interface AgentInfo {
  id: string
  name: string
  ide: string
  startedAt: string
  lastSeen: string
  locksHeld: string[]
  claimedPhase?: string
}

export interface PhaseClaim {
  phase: string
  agentId: string
  agentName: string
  claimedAt: string
  heartbeatAt: string
  ttlMs: number
  files: string[]
}

function locksRoot(projectRoot: string): string {
  return join(resolve(projectRoot), LOCKS_DIR)
}

function registryPath(projectRoot: string): string {
  return join(resolve(projectRoot), AGENTS_REGISTRY)
}

function ensureDirs(projectRoot: string): void {
  const root = resolve(projectRoot)
  const locks = locksRoot(root)
  if (!existsSync(join(root, ".uagent"))) mkdirSync(join(root, ".uagent"), { recursive: true })
  if (!existsSync(locks)) mkdirSync(locks, { recursive: true })
  if (!existsSync(registryPath(root))) {
    writeFileSync(registryPath(root), JSON.stringify({ agents: {} }, null, 2), "utf-8")
  }
}

function readRegistry(projectRoot: string): Record<string, AgentInfo> {
  ensureDirs(projectRoot)
  try {
    const raw = readFileSync(registryPath(projectRoot), "utf-8")
    return (JSON.parse(raw).agents ?? {}) as Record<string, AgentInfo>
  } catch {
    return {}
  }
}

function writeRegistry(projectRoot: string, agents: Record<string, AgentInfo>): void {
  ensureDirs(projectRoot)
  writeFileSync(registryPath(projectRoot), JSON.stringify({ agents }, null, 2), "utf-8")
}

function lockFileName(file: string): string {
  return `${file.replace(/[/\\:]/g, "_")}.json`
}

function lockPath(projectRoot: string, file: string): string {
  return join(locksRoot(projectRoot), lockFileName(file))
}

export function isLockStale(lock: FileLock, now = Date.now()): boolean {
  const hb = new Date(lock.heartbeatAt).getTime()
  return Number.isNaN(hb) || now - hb > lock.ttlMs
}

export function isClaimStale(claim: PhaseClaim, now = Date.now()): boolean {
  const hb = new Date(claim.heartbeatAt).getTime()
  return Number.isNaN(hb) || now - hb > claim.ttlMs
}

function acquireAtomic(path: string, body: string): boolean {
  try {
    const fd = openSync(path, "wx")
    writeFileSync(fd, body, "utf-8")
    closeSync(fd)
    return true
  } catch {
    return false
  }
}

function generateAgentId(name: string, ide: string): string {
  const safe = name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32)
  return `${safe}-${ide}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function registerAgent(
  projectRoot: string,
  name: string,
  ide: string,
): AgentInfo {
  ensureDirs(projectRoot)
  const agents = readRegistry(projectRoot)
  const id = generateAgentId(name, ide)
  const now = new Date().toISOString()
  const agent: AgentInfo = {
    id,
    name,
    ide,
    startedAt: now,
    lastSeen: now,
    locksHeld: [],
  }
  agents[id] = agent
  writeRegistry(projectRoot, agents)
  return agent
}

export function unregisterAgent(projectRoot: string, agentId: string): boolean {
  const agents = readRegistry(projectRoot)
  const agent = agents[agentId]
  if (!agent) return false
  for (const file of [...agent.locksHeld]) {
    releaseLock(projectRoot, file, agentId)
  }
  if (agent.claimedPhase) {
    releasePhaseClaim(projectRoot, agentId, agent.claimedPhase)
  }
  delete agents[agentId]
  writeRegistry(projectRoot, agents)
  return true
}

export function heartbeatAgent(projectRoot: string, agentId: string): boolean {
  const agents = readRegistry(projectRoot)
  const agent = agents[agentId]
  if (!agent) return false
  const now = new Date().toISOString()
  agent.lastSeen = now
  for (const file of agent.locksHeld) {
    const path = lockPath(projectRoot, file)
    if (!existsSync(path)) continue
    try {
      const lock = JSON.parse(readFileSync(path, "utf-8")) as FileLock
      if (lock.agentId !== agentId) continue
      lock.heartbeatAt = now
      writeFileSync(path, JSON.stringify(lock, null, 2), "utf-8")
    } catch {
      /* ignore */
    }
  }
  writeRegistry(projectRoot, agents)
  if (agent.claimedPhase) {
    touchPhaseClaim(projectRoot, agentId, agent.claimedPhase)
  }
  return true
}

export function tryAcquireLock(
  projectRoot: string,
  file: string,
  agentId: string,
  opts: { ttlMs?: number; phase?: string } = {},
): { success: boolean; lock?: FileLock; reason?: string } {
  ensureDirs(projectRoot)
  const agents = readRegistry(projectRoot)
  const agent = agents[agentId]
  if (!agent) return { success: false, reason: "Agent not registered — run coord:register first" }

  const rel = file.replace(/\\/g, "/")
  const path = lockPath(projectRoot, rel)
  const now = new Date().toISOString()
  const ttlMs = opts.ttlMs ?? DEFAULT_LOCK_TTL_MS

  if (existsSync(path)) {
    try {
      const existing = JSON.parse(readFileSync(path, "utf-8")) as FileLock
      if (existing.agentId === agentId) {
        existing.heartbeatAt = now
        if (opts.phase) existing.phase = opts.phase
        writeFileSync(path, JSON.stringify(existing, null, 2), "utf-8")
        return { success: true, lock: existing }
      }
      if (!isLockStale(existing)) {
        return {
          success: false,
          lock: existing,
          reason: `Locked by ${existing.owner} (${existing.agentId}) until heartbeat+TTL`,
        }
      }
      unlinkSync(path)
    } catch {
      try {
        unlinkSync(path)
      } catch {
        /* ignore */
      }
    }
  }

  const lock: FileLock = {
    file: rel,
    owner: agent.name,
    agentId,
    phase: opts.phase,
    acquiredAt: now,
    ttlMs,
    heartbeatAt: now,
  }

  if (!acquireAtomic(path, JSON.stringify(lock, null, 2))) {
    return { success: false, reason: "Race — retry lock" }
  }
  if (!agent.locksHeld.includes(rel)) agent.locksHeld.push(rel)
  writeRegistry(projectRoot, agents)
  return { success: true, lock }
}

export function releaseLock(projectRoot: string, file: string, agentId: string): boolean {
  const agents = readRegistry(projectRoot)
  const agent = agents[agentId]
  if (!agent) return false
  const rel = file.replace(/\\/g, "/")
  const path = lockPath(projectRoot, rel)
  if (existsSync(path)) {
    try {
      const lock = JSON.parse(readFileSync(path, "utf-8")) as FileLock
      if (lock.agentId !== agentId) return false
      unlinkSync(path)
    } catch {
      return false
    }
  }
  agent.locksHeld = agent.locksHeld.filter((f) => f !== rel)
  writeRegistry(projectRoot, agents)
  return true
}

export function listLocks(projectRoot: string): FileLock[] {
  const dir = locksRoot(projectRoot)
  if (!existsSync(dir)) return []
  const out: FileLock[] = []
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue
    try {
      out.push(JSON.parse(readFileSync(join(dir, name), "utf-8")) as FileLock)
    } catch {
      /* ignore */
    }
  }
  return out
}

export function findConflicts(
  projectRoot: string,
  agentId: string,
  files: string[],
): Array<{ file: string; lock: FileLock }> {
  const conflicts: Array<{ file: string; lock: FileLock }> = []
  for (const file of files) {
    const rel = file.replace(/\\/g, "/")
    const path = lockPath(projectRoot, rel)
    if (!existsSync(path)) continue
    try {
      const lock = JSON.parse(readFileSync(path, "utf-8")) as FileLock
      if (lock.agentId === agentId) continue
      if (isLockStale(lock)) continue
      conflicts.push({ file: rel, lock })
    } catch {
      /* ignore */
    }
  }
  return conflicts
}

export function cleanupStaleLocks(projectRoot: string): string[] {
  const removed: string[] = []
  for (const lock of listLocks(projectRoot)) {
    if (!isLockStale(lock)) continue
    const path = lockPath(projectRoot, lock.file)
    try {
      unlinkSync(path)
      removed.push(lock.file)
    } catch {
      /* ignore */
    }
  }
  const agents = readRegistry(projectRoot)
  let dirty = false
  for (const agent of Object.values(agents)) {
    const before = agent.locksHeld.length
    agent.locksHeld = agent.locksHeld.filter((f) => existsSync(lockPath(projectRoot, f)))
    if (agent.locksHeld.length !== before) dirty = true
  }
  if (dirty) writeRegistry(projectRoot, agents)
  return removed
}

/** --- Claims in PROJECT_MEMORY.md --- */

const CLAIMS_HEADER = "## Active claims"

function memoryPath(projectRoot: string, canonical = CANONICAL_MEMORY_FILE): string {
  return join(resolve(projectRoot), canonical)
}

export function parsePhaseClaims(memoryText: string): PhaseClaim[] {
  const idx = memoryText.indexOf(CLAIMS_HEADER)
  if (idx < 0) return []
  const rest = memoryText.slice(idx + CLAIMS_HEADER.length)
  const nextH2 = rest.search(/\n## /)
  const block = nextH2 >= 0 ? rest.slice(0, nextH2) : rest
  const claims: PhaseClaim[] = []
  const rowRe =
    /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|/gm
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(block)) !== null) {
    const phase = m[1]?.trim() ?? ""
    const agentId = m[2]?.trim() ?? ""
    const agentName = m[3]?.trim() ?? ""
    const claimedAt = m[4]?.trim() ?? ""
    const heartbeatAt = m[5]?.trim() ?? ""
    const filesRaw = m[6]?.trim() ?? ""
    if (!phase || /^-+$/.test(phase) || (/phase/i.test(phase) && /agent/i.test(agentId))) continue
    if (phase.toLowerCase() === "phase") continue
    claims.push({
      phase,
      agentId,
      agentName,
      claimedAt,
      heartbeatAt,
      ttlMs: DEFAULT_LOCK_TTL_MS,
      files: filesRaw
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean),
    })
  }
  return claims
}

function renderClaimsSection(claims: PhaseClaim[]): string {
  const live = claims.filter((c) => !isClaimStale(c))
  const lines = [
    CLAIMS_HEADER,
    "",
    "_Live phase reservations for multi-agent coordination. Stale rows (past TTL without heartbeat) may be taken by another agent after `uagent coord:cleanup`._",
    "",
    "| Phase | Agent ID | Agent | Claimed at | Heartbeat | Files |",
    "|-------|----------|-------|------------|-----------|-------|",
  ]
  for (const c of live) {
    lines.push(
      `| ${c.phase} | ${c.agentId} | ${c.agentName} | ${c.claimedAt} | ${c.heartbeatAt} | ${c.files.join(", ") || "—"} |`,
    )
  }
  if (!live.length) {
    lines.push("| — | — | — | — | — | — |")
  }
  lines.push("")
  return lines.join("\n")
}

export function upsertClaimsSection(memoryText: string, claims: PhaseClaim[]): string {
  const section = renderClaimsSection(claims)
  if (memoryText.includes(CLAIMS_HEADER)) {
    return memoryText.replace(
      new RegExp(`${CLAIMS_HEADER}[\\s\\S]*?(?=\\n## |$)`),
      section.replace(/\n$/, "") + "\n",
    )
  }
  // Insert after Phases section if present, else append
  if (/## Phases/i.test(memoryText)) {
    return memoryText.replace(/(## Phases[\s\S]*?)(?=\n## |$)/i, (block) => `${block.trimEnd()}\n\n${section}`)
  }
  return `${memoryText.trimEnd()}\n\n${section}`
}

export function readLiveClaims(
  projectRoot: string,
  canonical = CANONICAL_MEMORY_FILE,
): PhaseClaim[] {
  const path = memoryPath(projectRoot, canonical)
  const text = readTextFile(path)
  if (text === null) return []
  return parsePhaseClaims(text).filter((c) => !isClaimStale(c))
}

export function claimPhase(
  projectRoot: string,
  agentId: string,
  phase: string,
  files: string[] = [],
  canonical = CANONICAL_MEMORY_FILE,
  ttlMs = DEFAULT_LOCK_TTL_MS,
): { success: boolean; reason?: string; claim?: PhaseClaim } {
  const agents = readRegistry(projectRoot)
  const agent = agents[agentId]
  if (!agent) return { success: false, reason: "Agent not registered" }

  const path = memoryPath(projectRoot, canonical)
  let text = readTextFile(path)
  if (text === null) {
    return { success: false, reason: `${canonical} missing — run init first` }
  }

  const all = parsePhaseClaims(text)
  const live = all.filter((c) => !isClaimStale(c))
  const held = live.find((c) => c.phase === phase)
  if (held && held.agentId !== agentId) {
    return {
      success: false,
      reason: `Phase "${phase}" claimed by ${held.agentName} (${held.agentId})`,
    }
  }

  const now = new Date().toISOString()
  const claim: PhaseClaim = {
    phase,
    agentId,
    agentName: agent.name,
    claimedAt: held?.claimedAt ?? now,
    heartbeatAt: now,
    ttlMs,
    files,
  }
  const nextClaims = [...live.filter((c) => !(c.phase === phase && c.agentId === agentId)), claim]
  text = upsertClaimsSection(text, nextClaims)
  writeFileSync(path, text, "utf-8")
  agent.claimedPhase = phase
  writeRegistry(projectRoot, agents)
  return { success: true, claim }
}

export function releasePhaseClaim(
  projectRoot: string,
  agentId: string,
  phase: string,
  canonical = CANONICAL_MEMORY_FILE,
): boolean {
  const path = memoryPath(projectRoot, canonical)
  const text = readTextFile(path)
  if (text === null) return false
  const all = parsePhaseClaims(text)
  const next = all.filter((c) => !(c.agentId === agentId && c.phase === phase))
  writeFileSync(path, upsertClaimsSection(text, next), "utf-8")
  const agents = readRegistry(projectRoot)
  const agent = agents[agentId]
  if (agent?.claimedPhase === phase) {
    agent.claimedPhase = undefined
    writeRegistry(projectRoot, agents)
  }
  return true
}

function touchPhaseClaim(projectRoot: string, agentId: string, phase: string): void {
  const existing = readLiveClaims(projectRoot).find((c) => c.agentId === agentId && c.phase === phase)
  claimPhase(projectRoot, agentId, phase, existing?.files ?? [], CANONICAL_MEMORY_FILE)
}

export function cleanupStaleClaims(
  projectRoot: string,
  canonical = CANONICAL_MEMORY_FILE,
): string[] {
  const path = memoryPath(projectRoot, canonical)
  const text = readTextFile(path)
  if (text === null) return []
  const all = parsePhaseClaims(text)
  const stale = all.filter((c) => isClaimStale(c))
  if (!stale.length) return []
  const live = all.filter((c) => !isClaimStale(c))
  writeFileSync(path, upsertClaimsSection(text, live), "utf-8")
  return stale.map((c) => c.phase)
}

/** Mandated coordination lines for AGENTS.md / reconcile. */
export const COORD_MANDATED_RULES: string[] = [
  "Before editing code or starting a phase: run uagent coord:register, claim the phase in PROJECT_MEMORY.md Active claims, and lock the files with uagent coord:lock",
  "Never mark a phase [x] that another agent holds with a live claim or lock",
  "Never edit files under another agent's live lock; run uagent coord:cleanup for stale TTL first, then take a free phase",
  "While working, run uagent coord:heartbeat periodically; on finish or stop, unlock files and clear your phase claim",
]
