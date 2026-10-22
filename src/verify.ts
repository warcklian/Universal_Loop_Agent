import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"
import { COMMAND_NAMES } from "./commands.ts"

export type VerifyFindingKind =
  | "unknown-command"
  | "unwired-command"
  | "undocumented-command"

export interface VerifyFinding {
  kind: VerifyFindingKind
  command: string
  where: string
  detail: string
}

export interface VerifyReport {
  root: string
  ok: boolean
  findings: VerifyFinding[]
  registered: string[]
  wired: string[]
  documented: string[]
}

/** Tokens that look like commands but are not uagent subcommands. */
const NON_COMMANDS = new Set([
  "uagent",
  "bun",
  "npm",
  "npx",
  "node",
  "docker",
  "git",
  "cd",
  "echo",
  "call",
  "set",
  "if",
  "for",
  "where",
  "powershell",
  "pwsh",
  "install",
  "run",
  "test",
  "dev",
  "build",
  "lint",
  "typecheck",
  "x",
  "tsc",
  "help",
  "version",
  "force",
  "dry-run",
  "yes",
  "prune",
  "i-accept-deletes",
  "skip-agents-regen",
  "check",
  "adapters",
  "init-memory",
  "skip-memory",
  "skip-yaml",
  "batch-size",
  "output",
])

const SURFACE_FILES = [
  "README.md",
  "Index.md",
  "setup-all.bat",
  "setup-all.ps1",
  "generate.bat",
  "generate.ps1",
  "init.bat",
]

function readOptional(path: string): string | null {
  if (!existsSync(path)) return null
  try {
    return readFileSync(path, "utf-8")
  } catch {
    return null
  }
}

/**
 * Extract commands from real invocations only (not prose / markdown tables).
 * Table `| \`cmd\` |` rows are used for README documentation checks separately.
 */
export function extractMentionedCommands(text: string): Map<string, number> {
  const counts = new Map<string, number>()

  // Require a command-like continuation so prose ("uagent and …", "uagent bin, …") is ignored.
  const afterCmd = String.raw`(?=(?:\s+--|\s+\.\.|\s+[./\\]|\s*$|\s+["'` + "`" + String.raw`]|\s*\n))`
  const patterns: RegExp[] = [
    new RegExp(String.raw`\buagent\s+([a-z][a-z0-9:-]*)${afterCmd}`, "gi"),
    new RegExp(
      String.raw`\b(?:bun|npx|node)\s+(?:run\s+)?(?:src\/)?cli\.ts\s+([a-z][a-z0-9:-]*)${afterCmd}`,
      "gi",
    ),
    new RegExp(
      String.raw`^\s*(?:call\s+)?bun\s+run\s+src\/cli\.ts\s+([a-z][a-z0-9:-]*)${afterCmd}`,
      "gim",
    ),
  ]

  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const raw = m[1]
      if (!raw) continue
      const cmd = raw.toLowerCase()
      if (NON_COMMANDS.has(cmd)) continue
      if (!/^[a-z][a-z0-9:-]*$/.test(cmd)) continue
      counts.set(cmd, (counts.get(cmd) ?? 0) + 1)
    }
  }

  return counts
}

/** Commands wired in cli.ts via .command("…"). */
export function extractWiredCommands(cliSource: string): string[] {
  const names: string[] = []
  const re = /\.command\(\s*["']([^"']+)["']\s*\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(cliSource)) !== null) {
    if (m[1]) names.push(m[1])
  }
  return [...new Set(names)]
}

function collectSurfaceText(root: string): { text: string; files: string[] } {
  const parts: string[] = []
  const files: string[] = []
  for (const rel of SURFACE_FILES) {
    const full = join(root, rel)
    const body = readOptional(full)
    if (body === null) continue
    files.push(rel)
    parts.push(body)
  }
  // Also scan .bat/.ps1 wrappers in root if present beyond the fixed list
  try {
    for (const name of readdirSync(root)) {
      if (!/\.(bat|ps1|txt|md)$/i.test(name)) continue
      if (SURFACE_FILES.includes(name)) continue
      if (/^(CHANGE_CONTROL|PROJECT_MEMORY|AGENTS|LICENSE)/i.test(name)) continue
      const body = readOptional(join(root, name))
      if (body && /\buagent\b|cli\.ts/i.test(body)) {
        files.push(name)
        parts.push(body)
      }
    }
  } catch {
    /* ignore */
  }
  return { text: parts.join("\n"), files }
}

/**
 * Verify toolkit surface coherence: registered ↔ wired ↔ documented.
 */
export function runVerify(targetDir: string): VerifyReport {
  const root = resolve(targetDir)
  const findings: VerifyFinding[] = []
  const registered = [...COMMAND_NAMES]

  const cliPath = join(root, "src", "cli.ts")
  const cliBody = readOptional(cliPath) ?? ""
  const wired = extractWiredCommands(cliBody)

  for (const name of registered) {
    if (!wired.includes(name)) {
      findings.push({
        kind: "unwired-command",
        command: name,
        where: "src/cli.ts",
        detail: `commands.ts lists "${name}" but cli.ts has no .command("${name}")`,
      })
    }
  }

  for (const name of wired) {
    if (!registered.includes(name) && !name.includes(":")) {
      // Allow future namespaced commands (coord:*) only if registered; otherwise flag
      findings.push({
        kind: "unknown-command",
        command: name,
        where: "src/cli.ts",
        detail: `cli.ts wires "${name}" but commands.ts does not register it`,
      })
    }
  }

  const { text: surface, files: surfaceFiles } = collectSurfaceText(root)
  const mentioned = extractMentionedCommands(surface)
  const documented = new Set<string>()

  // README must mention each registered command as `name` (backticks) for undocumented check
  const readme = readOptional(join(root, "README.md")) ?? ""
  for (const name of registered) {
    const backtick = new RegExp(`\`${name}\``)
    const uagentCall = new RegExp(`\\buagent\\s+${name}\\b`)
    if (backtick.test(readme) || uagentCall.test(readme)) {
      documented.add(name)
    }
  }

  for (const name of registered) {
    if (!documented.has(name)) {
      findings.push({
        kind: "undocumented-command",
        command: name,
        where: "README.md",
        detail: `registered command "${name}" does not appear as \`name\` or uagent ${name} in README.md`,
      })
    }
  }

  for (const [cmd, count] of mentioned) {
    if (NON_COMMANDS.has(cmd)) continue
    if (registered.includes(cmd)) continue
    // Ignore option-like and path fragments
    if (cmd.includes("/") || cmd.includes("\\")) continue
    findings.push({
      kind: "unknown-command",
      command: cmd,
      where: surfaceFiles.join(", ") || "surface",
      detail: `surface mentions "${cmd}" (${count}×) but it is not a registered uagent command`,
    })
  }

  return {
    root,
    ok: findings.length === 0,
    findings,
    registered,
    wired,
    documented: [...documented],
  }
}

export function formatVerifyReport(report: VerifyReport): string {
  const lines = [
    `\n  uagent verify`,
    `  Root: ${report.root}`,
    `  Status: ${report.ok ? "OK" : "FAIL"}`,
    `  Registered: ${report.registered.length} · Wired: ${report.wired.length} · Documented: ${report.documented.length}`,
    "",
  ]
  if (!report.findings.length) {
    lines.push("  No surface inconsistencies.")
    lines.push("")
    return lines.join("\n")
  }
  for (const f of report.findings) {
    lines.push(`  [!!] ${f.kind}: ${f.command}`)
    lines.push(`       ${f.where} — ${f.detail}`)
  }
  lines.push("")
  return lines.join("\n")
}
