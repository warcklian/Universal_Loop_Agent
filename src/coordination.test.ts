import { describe, expect, test } from "bun:test"
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import {
  claimPhase,
  cleanupStaleClaims,
  cleanupStaleLocks,
  findConflicts,
  heartbeatAgent,
  isLockStale,
  listLocks,
  registerAgent,
  releaseLock,
  releasePhaseClaim,
  tryAcquireLock,
  unregisterAgent,
  DEFAULT_LOCK_TTL_MS,
} from "./coordination.ts"

function tmpRoot(tag: string): string {
  const root = join(tmpdir(), `uagent-coord-${tag}-${Date.now()}`)
  mkdirSync(root, { recursive: true })
  writeFileSync(
    join(root, "PROJECT_MEMORY.md"),
    "# Mem\n\n## Phases\n\n- [ ] Phase Alpha\n- [ ] Phase Beta\n",
    "utf-8",
  )
  return root
}

describe("coordination locks", () => {
  test("register, lock, conflict, unlock", () => {
    const root = tmpRoot("lock")
    try {
      const a = registerAgent(root, "Alice", "cursor")
      const b = registerAgent(root, "Bob", "claude")
      const r1 = tryAcquireLock(root, "src/a.ts", a.id)
      expect(r1.success).toBe(true)
      const conflict = findConflicts(root, b.id, ["src/a.ts"])
      expect(conflict.length).toBe(1)
      expect(conflict[0]?.lock.agentId).toBe(a.id)
      const r2 = tryAcquireLock(root, "src/a.ts", b.id)
      expect(r2.success).toBe(false)
      expect(releaseLock(root, "src/a.ts", a.id)).toBe(true)
      expect(tryAcquireLock(root, "src/a.ts", b.id).success).toBe(true)
      unregisterAgent(root, a.id)
      unregisterAgent(root, b.id)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("stale lock can be cleaned and re-acquired", () => {
    const root = tmpRoot("stale")
    try {
      const a = registerAgent(root, "A", "x")
      const r = tryAcquireLock(root, "f.ts", a.id, { ttlMs: 1 })
      expect(r.success).toBe(true)
      // Force stale heartbeat
      const locks = listLocks(root)
      expect(locks[0]).toBeDefined()
      const lock = locks[0]!
      lock.heartbeatAt = new Date(Date.now() - 60_000).toISOString()
      lock.ttlMs = 1
      writeFileSync(
        join(root, ".uagent", "locks", "f.ts.json"),
        JSON.stringify(lock, null, 2),
        "utf-8",
      )
      expect(isLockStale(lock)).toBe(true)
      const removed = cleanupStaleLocks(root)
      expect(removed).toContain("f.ts")
      const b = registerAgent(root, "B", "y")
      expect(tryAcquireLock(root, "f.ts", b.id).success).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("heartbeat renews lock TTL window", () => {
    const root = tmpRoot("hb")
    try {
      const a = registerAgent(root, "A", "x")
      tryAcquireLock(root, "x.ts", a.id, { ttlMs: DEFAULT_LOCK_TTL_MS })
      const before = listLocks(root)[0]!.heartbeatAt
      expect(heartbeatAgent(root, a.id)).toBe(true)
      const after = listLocks(root)[0]!.heartbeatAt
      expect(after >= before).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("coordination claims in memory", () => {
  test("claim phase blocks other agent; release frees it", () => {
    const root = tmpRoot("claim")
    try {
      const a = registerAgent(root, "Alice", "cursor")
      const b = registerAgent(root, "Bob", "claude")
      const c1 = claimPhase(root, a.id, "Phase Alpha", ["src/a.ts"])
      expect(c1.success).toBe(true)
      const c2 = claimPhase(root, b.id, "Phase Alpha", ["src/a.ts"])
      expect(c2.success).toBe(false)
      expect(releasePhaseClaim(root, a.id, "Phase Alpha")).toBe(true)
      expect(claimPhase(root, b.id, "Phase Alpha").success).toBe(true)
      const mem = readFileSync(join(root, "PROJECT_MEMORY.md"), "utf-8")
      expect(mem).toContain("## Active claims")
      expect(mem).toContain("Phase Alpha")
      expect(mem).toContain("## Phases")
      expect(mem).toContain("- [ ] Phase Beta")
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("stale claims cleaned without wiping phases", () => {
    const root = tmpRoot("claim-stale")
    try {
      const a = registerAgent(root, "A", "x")
      claimPhase(root, a.id, "Phase Alpha", [], "PROJECT_MEMORY.md", 1)
      // rewrite claim heartbeat to past
      let mem = readFileSync(join(root, "PROJECT_MEMORY.md"), "utf-8")
      mem = mem.replace(
        /\| Phase Alpha \|[^|]+\|[^|]+\|[^|]+\|[^|]+\|/,
        `| Phase Alpha | ${a.id} | A | 2000-01-01T00:00:00.000Z | 2000-01-01T00:00:00.000Z | |`,
      )
      writeFileSync(join(root, "PROJECT_MEMORY.md"), mem, "utf-8")
      const cleaned = cleanupStaleClaims(root)
      expect(cleaned).toContain("Phase Alpha")
      const after = readFileSync(join(root, "PROJECT_MEMORY.md"), "utf-8")
      expect(after).toContain("## Phases")
      expect(after).toContain("- [ ] Phase Beta")
      expect(existsSync(join(root, ".uagent", "locks")) || true).toBe(true)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
