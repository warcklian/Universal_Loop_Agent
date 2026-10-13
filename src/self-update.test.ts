import { describe, expect, test } from "bun:test"
import { execSync } from "node:child_process"
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { applySelfUpdate, checkSelfUpdate, classifyUpdate } from "./self-update.ts"

function sh(dir: string, cmd: string): void {
  execSync(cmd, { cwd: dir, stdio: ["ignore", "ignore", "ignore"] })
}

/** Local origin repo + a clone that plays the role of the nested toolkit folder. */
function makeClonePair(tag: string): { origin: string; toolkit: string } {
  const root = join(tmpdir(), `uagent-upd-${tag}-${Date.now()}`)
  mkdirSync(root, { recursive: true })

  const origin = join(root, "origin.git")
  sh(root, `git init --bare -q "${origin}"`)

  const seed = join(root, "seed")
  mkdirSync(seed, { recursive: true })
  writeFileSync(join(seed, "a.txt"), "v1", "utf-8")
  sh(seed, "git init -q -b main")
  sh(seed, "git add -A")
  sh(seed, 'git -c user.name=upd -c user.email=upd@test commit -q -m v1')
  sh(seed, `git remote add origin "${origin}"`)
  sh(seed, "git push -q -u origin main")
  sh(origin, "git symbolic-ref HEAD refs/heads/main")

  const toolkit = join(root, "toolkit")
  sh(root, `git clone -q "${origin}" "${toolkit}"`)
  return { origin, toolkit }
}

function pushNewCommit(origin: string, toolkit: string, name: string, content: string): void {
  const seed = join(origin, "..", "seed")
  writeFileSync(join(seed, name), content, "utf-8")
  sh(seed, "git add -A")
  sh(seed, `git -c user.name=upd -c user.email=upd@test commit -q -m add-${name}`)
  sh(seed, "git push -q origin main")
}

describe("update status classification", () => {
  test("fresh clone is up to date", () => {
    const { toolkit } = makeClonePair("fresh")
    try {
      const check = checkSelfUpdate(toolkit)
      expect(check.status).toBe("up-to-date")
      expect(check.branch).toBe("main")
      expect(check.updatable).toBe(false)
    } finally {
      rmSync(join(toolkit, ".."), { recursive: true, force: true })
    }
  }, 30_000)

  test("remote ahead is reported as behind and fast-forwarded", () => {
    const { origin, toolkit } = makeClonePair("behind")
    try {
      pushNewCommit(origin, toolkit, "b.txt", "nuevo")

      const check = checkSelfUpdate(toolkit)
      expect(check.status).toBe("behind")
      expect(check.behind).toBe(1)
      expect(check.updatable).toBe(true)

      const result = applySelfUpdate(toolkit)
      expect(result.applied).toBe(true)
      expect(readFileSync(join(toolkit, "b.txt"), "utf-8")).toBe("nuevo")
      expect(checkSelfUpdate(toolkit).status).toBe("up-to-date")
    } finally {
      rmSync(join(toolkit, ".."), { recursive: true, force: true })
    }
  }, 30_000)

  test("dry-run reports but changes nothing", () => {
    const { origin, toolkit } = makeClonePair("dry")
    try {
      pushNewCommit(origin, toolkit, "b.txt", "nuevo")
      const result = applySelfUpdate(toolkit, { dryRun: true })
      expect(result.applied).toBe(false)
      expect(existsSync(join(toolkit, "b.txt"))).toBe(false)
      expect(checkSelfUpdate(toolkit).status).toBe("behind")
    } finally {
      rmSync(join(toolkit, ".."), { recursive: true, force: true })
    }
  }, 30_000)

  test("dirty tree is never updated and local edits survive", () => {
    const { origin, toolkit } = makeClonePair("dirty")
    try {
      pushNewCommit(origin, toolkit, "b.txt", "nuevo")
      writeFileSync(join(toolkit, "a.txt"), "edit-local", "utf-8")

      const result = applySelfUpdate(toolkit)
      expect(result.applied).toBe(false)
      expect(result.check.status).toBe("dirty")
      expect(readFileSync(join(toolkit, "a.txt"), "utf-8")).toBe("edit-local")
      expect(existsSync(join(toolkit, "b.txt"))).toBe(false)
    } finally {
      rmSync(join(toolkit, ".."), { recursive: true, force: true })
    }
  }, 30_000)

  test("local commits ahead are reported, not rolled back", () => {
    const { origin, toolkit } = makeClonePair("ahead")
    try {
      writeFileSync(join(toolkit, "local.txt"), "solo local", "utf-8")
      sh(toolkit, "git add -A")
      sh(toolkit, 'git -c user.name=upd -c user.email=upd@test commit -q -m local')

      const result = applySelfUpdate(toolkit)
      expect(result.applied).toBe(false)
      expect(result.check.status).toBe("ahead")
      expect(result.check.ahead).toBe(1)
      expect(readFileSync(join(toolkit, "local.txt"), "utf-8")).toBe("solo local")
    } finally {
      rmSync(join(toolkit, ".."), { recursive: true, force: true })
    }
  }, 30_000)

  test("folder without git reports no-git and never throws", () => {
    const root = join(tmpdir(), `uagent-upd-nogit-${Date.now()}`)
    mkdirSync(root, { recursive: true })
    try {
      const check = checkSelfUpdate(root)
      expect(check.status).toBe("no-git")
      expect(check.updatable).toBe(false)
      expect(applySelfUpdate(root).applied).toBe(false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test("classifier maps every combination", () => {
    const base = { hasGit: true, hasRemote: true, fetchOk: true, detached: false, dirty: false, behind: 0, ahead: 0 }
    expect(classifyUpdate({ ...base })).toBe("up-to-date")
    expect(classifyUpdate({ ...base, behind: 3 })).toBe("behind")
    expect(classifyUpdate({ ...base, ahead: 2 })).toBe("ahead")
    expect(classifyUpdate({ ...base, behind: 1, ahead: 1 })).toBe("diverged")
    expect(classifyUpdate({ ...base, dirty: true })).toBe("dirty")
    expect(classifyUpdate({ ...base, detached: true })).toBe("detached")
    expect(classifyUpdate({ ...base, fetchOk: false })).toBe("offline")
    expect(classifyUpdate({ ...base, hasRemote: false })).toBe("no-remote")
    expect(classifyUpdate({ ...base, hasGit: false })).toBe("no-git")
  })
})
