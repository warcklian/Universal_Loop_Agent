import { execSync } from "node:child_process"
import { join, resolve } from "node:path"

/**
 * Self-update for the toolkit folder.
 * Checks the remote and fast-forwards the local clone. Never rewrites history:
 * it only ever applies a fast-forward, so local work can never be lost.
 */

export type UpdateStatus =
  | "up-to-date"
  | "behind"
  | "ahead"
  | "diverged"
  | "dirty"
  | "detached"
  | "no-git"
  | "no-remote"
  | "offline"

export interface SelfUpdateCheck {
  status: UpdateStatus
  /** null when the status cannot depend on a branch (no-git, no-remote, detached) */
  branch: string | null
  localHead: string | null
  remoteHead: string | null
  behind: number
  ahead: number
  updatable: boolean
  message: string
}

export interface SelfUpdateResult {
  check: SelfUpdateCheck
  applied: boolean
  message: string
}

/** Run a git command inside the toolkit folder. Shell-free, no user input in args. */
function git(dir: string, args: string[], timeoutMs = 90_000): { ok: boolean; out: string } {
  try {
    const out = execSync(["git", ...args].join(" "), {
      cwd: dir,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: timeoutMs,
    })
    return { ok: true, out: (out ?? "").trim() }
  } catch {
    return { ok: false, out: "" }
  }
}

/** Pure status classifier — the only part that decides behaviour, easy to test. */
export function classifyUpdate(input: {
  hasGit: boolean
  hasRemote: boolean
  fetchOk: boolean
  detached: boolean
  dirty: boolean
  behind: number
  ahead: number
}): UpdateStatus {
  if (!input.hasGit) return "no-git"
  if (!input.hasRemote) return "no-remote"
  if (!input.fetchOk) return "offline"
  if (input.detached) return "detached"
  if (input.dirty) return "dirty"
  if (input.behind > 0 && input.ahead > 0) return "diverged"
  if (input.behind > 0) return "behind"
  if (input.ahead > 0) return "ahead"
  return "up-to-date"
}

export function checkSelfUpdate(targetDir: string): SelfUpdateCheck {
  const dir = resolve(targetDir)

  const insideWorkTree = git(dir, ["rev-parse", "--is-inside-work-tree"])
  if (!insideWorkTree.ok || insideWorkTree.out !== "true") {
    return {
      status: "no-git",
      branch: null,
      localHead: null,
      remoteHead: null,
      behind: 0,
      ahead: 0,
      updatable: false,
      message: "This toolkit folder is not a git clone — update it by copying the folder",
    }
  }

  if (git(dir, ["remote", "get-url", "origin"]).ok === false) {
    return {
      status: "no-remote",
      branch: null,
      localHead: null,
      remoteHead: null,
      behind: 0,
      ahead: 0,
      updatable: false,
      message: 'No "origin" remote configured — add one to enable self-update',
    }
  }

  // Network step: a failure here only means "cannot check", never a broken toolkit
  const fetched = git(dir, ["fetch", "origin", "--quiet"])

  const localHead = git(dir, ["rev-parse", "--short", "HEAD"])
  const branchRef = git(dir, ["rev-parse", "--abbrev-ref", "HEAD"])

  if (!branchRef.ok || !branchRef.out || branchRef.out === "HEAD") {
    return {
      status: "detached",
      branch: null,
      localHead: localHead.out || null,
      remoteHead: null,
      behind: 0,
      ahead: 0,
      updatable: false,
      message: "HEAD is detached — checkout the branch before updating",
    }
  }

  const branch = branchRef.out
  const remoteRef = `refs/remotes/origin/${branch}`
  const remoteResolved = git(dir, ["rev-parse", "--verify", "--quiet", remoteRef])
  const remoteHead = git(dir, ["rev-parse", "--short", remoteRef])

  if (!fetched.ok || !remoteResolved.ok) {
    return {
      status: "offline",
      branch,
      localHead: localHead.out || null,
      remoteHead: remoteHead.out || null,
      behind: 0,
      ahead: 0,
      updatable: false,
      message: "Could not reach origin (offline or credentials) — keeping the local version",
    }
  }

  const statusPorcelain = git(dir, ["status", "--porcelain"])
  const counts = git(dir, ["rev-list", "--left-right", "--count", `HEAD...${remoteRef}`])
  const [aheadRaw, behindRaw] = counts.out.split(/\s+/)
  const ahead = Number(aheadRaw ?? 0) || 0
  const behind = Number(behindRaw ?? 0) || 0

  const status = classifyUpdate({
    hasGit: true,
    hasRemote: true,
    fetchOk: true,
    detached: false,
    dirty: statusPorcelain.out.length > 0,
    behind,
    ahead,
  })

  return {
    status,
    branch,
    localHead: localHead.out || null,
    remoteHead: remoteHead.out || null,
    behind,
    ahead,
    updatable: status === "behind",
    message: statusMessage(status, { behind, ahead, branch }),
  }
}

function statusMessage(
  status: UpdateStatus,
  info: { behind: number; ahead: number; branch: string },
): string {
  switch (status) {
    case "behind":
      return `${info.behind} commit(s) behind origin/${info.branch} — fast-forward available`
    case "ahead":
      return `${info.ahead} local commit(s) not pushed to origin/${info.branch}`
    case "up-to-date":
      return `Already on the latest origin/${info.branch}`
    case "diverged":
      return `Diverged from origin/${info.branch} (${info.ahead} ahead, ${info.behind} behind) — merge manually, self-update will not force it`
    case "dirty":
      return "Uncommitted changes in the toolkit folder — commit or stash them first"
    case "detached":
      return "HEAD is detached — checkout the branch before updating"
    default:
      return status
  }
}

/**
 * Fast-forward the toolkit when the remote is ahead. Returns the check even when
 * nothing is applied, so callers can always report a status.
 */
export function applySelfUpdate(
  targetDir: string,
  opts: { dryRun?: boolean } = {},
): SelfUpdateResult {
  const dir = resolve(targetDir)
  const check = checkSelfUpdate(dir)

  if (!check.updatable) {
    return { check, applied: false, message: check.message }
  }

  if (opts.dryRun) {
    return { check, applied: false, message: `${check.message} (dry-run — not applied)` }
  }

  const merged = git(dir, ["merge", "--ff-only", `refs/remotes/origin/${check.branch}`])
  if (!merged.ok) {
    return {
      check,
      applied: false,
      message: `Fast-forward failed — resolve manually: git -C "${dir}" merge --ff-only origin/${check.branch}`,
    }
  }

  // The merge brought the tree to the fetched tip, so no second fetch is needed here
  const head = git(dir, ["rev-parse", "--short", "HEAD"])
  const newHead = head.out || check.remoteHead || "latest"
  const message = `Updated to ${newHead} (origin/${check.branch})`
  return {
    check: {
      ...check,
      status: "up-to-date",
      localHead: head.out || check.remoteHead,
      behind: 0,
      ahead: 0,
      updatable: false,
      message,
    },
    applied: true,
    message,
  }
}

export function formatSelfUpdate(result: SelfUpdateResult, root: string): string {
  const lines = [
    ``,
    `  uagent update`,
    `  Toolkit: ${root}`,
    `  Status: ${result.check.status}${result.check.branch ? ` (branch ${result.check.branch})` : ""}`,
    `  Local:  ${result.check.localHead ?? "n/a"}   Remote: ${result.check.remoteHead ?? "n/a"}`,
    ``,
    `  ${result.message}`,
    ``,
  ]
  return lines.join("\n")
}

