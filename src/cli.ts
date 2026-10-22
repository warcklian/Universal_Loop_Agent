#!/usr/bin/env bun

import { Command } from "commander"
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { dirname, resolve, join } from "node:path"
import * as readline from "node:readline"
import { parseSource, ParseError } from "./parser.ts"
import { generate } from "./generator.ts"
import { detectProject } from "./detector.ts"
import { writeYaml } from "./yaml-generator.ts"
import { initMemory, ensureMemory } from "./memory.ts"
import { formatUpgradeSummary, runUpgrade } from "./upgrade.ts"
import { applySelfUpdate, checkSelfUpdate, formatSelfUpdate } from "./self-update.ts"
import { ensureIdeaFile, removeObsoleteStartPromptFile } from "./idea-template.ts"
import { planFromIdea } from "./plan-from.ts"
import { formatDoctorReport, runDoctor } from "./doctor.ts"
import { syncAdapters } from "./adapters.ts"
import { adoptProject } from "./adopt.ts"
import { formatVerifyReport, runVerify } from "./verify.ts"
import { formatReconcileReport, runReconcile } from "./reconcile.ts"
import { getCommand } from "./commands.ts"
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

function cmdDesc(name: string, fallback: string): string {
  return getCommand(name)?.summary ?? fallback
}

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(`  ${question} (y/N): `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes")
    })
  })
}

const program = new Command()

program
  .name("uagent")
  .description("Universal agent config generator — adaptative to any project")
  .version("0.1.0")

program
  .command("init")
  .description(cmdDesc("init", "Initialize uagent for the parent project (auto-detect stack)"))
  .argument("[target]", "Target project directory (default: parent of uagent folder)", "..")
  .option("--skip-memory", "Skip memory initialization")
  .option("--skip-yaml", "Skip YAML generation (keep existing universal-agent.yaml)")
  .action((target: string, opts: { skipMemory?: boolean; skipYaml?: boolean }) => {
    const targetDir = resolve(target)
    console.log(`\n  Scanning project: ${targetDir}\n`)

    const project = detectProject(targetDir)

    console.log(`  Project:  ${project.name}`)
    console.log(`  Langs:    ${project.languages.join(", ") || "none detected"}`)
    console.log(`  Frameworks: ${project.frameworks.join(", ") || "none detected"}`)
    console.log(`  Runtime:  ${project.runtime.join(", ") || "none detected"}`)
    console.log(`  Pkg mgr:  ${project.packageManagers.join(", ") || "none detected"}`)
    console.log(`  Databases: ${project.databases.join(", ") || "none detected"}`)
    console.log(`  Git:      ${project.hasGit ? "yes" : "no"}`)
    console.log()

    if (!opts.skipYaml) {
      const yamlPath = join(targetDir, "universal-agent.yaml")
      if (existsSync(yamlPath)) {
        console.log(`  universal-agent.yaml already exists — skipping (use --force to overwrite)`)
      } else {
        writeYaml(targetDir, project)
        console.log(`  Created universal-agent.yaml`)
      }
    }

    if (!opts.skipMemory) {
      initMemory(targetDir, project)
    }

    console.log(`\n  Done! Next steps:`)
    console.log(`  1. Edit PROJECT_MEMORY.md (canonical handoff), CHANGE_CONTROL.md (change register) and universal-agent.yaml if needed`)
    console.log(`  2. Run: uagent generate`)
    console.log(`  3. Load AGENTS.md in your AI editor (loop rules; memory stays in PROJECT_MEMORY.md)\n`)
  })

program
  .command("detect")
  .description(cmdDesc("detect", "Detect project stack without generating files"))
  .argument("[target]", "Target project directory", "..")
  .action((target: string) => {
    const targetDir = resolve(target)
    const project = detectProject(targetDir)

    console.log(JSON.stringify(project, null, 2))
  })

program
  .command("generate")
  .description(cmdDesc("generate", "Generate AGENTS.md from universal-agent.yaml"))
  .argument("[source]", "Path to source YAML", "universal-agent.yaml")
  .option("-o, --output <dir>", "Output directory", ".")
  .option("--dry-run", "Print without writing")
  .option("--init-memory", "Create .uagent/memory/ if missing")
  .option("--force", "Overwrite existing AGENTS.md without asking")
  .option("--adapters", "Write editor adapter files that point at AGENTS.md")
  .action(async (source: string, opts: { output: string; dryRun?: boolean; initMemory?: boolean; force?: boolean; adapters?: boolean }) => {
    try {
      const config = parseSource(source)
      const result = generate(config)
      const outPath = resolve(opts.output, result.file)

      if (opts.dryRun) {
        console.log(`\n--- ${outPath} ---\n`)
        console.log(result.content)
        return
      }

      const outDir = resolve(opts.output)
      if (existsSync(outPath) && !opts.force) {
        const existing = readFileSync(outPath, "utf-8")
        if (existing === result.content) {
          console.log(`  ${result.file} unchanged — skipped`)
          // AGENTS.md is current: drop obsolete paste file if a prior setup left one
          if (removeObsoleteStartPromptFile(outDir)) {
            console.log(`  Removed obsolete LOOP_START_PROMPT.txt (load AGENTS.md only)`)
          }
          if (opts.adapters) {
            const synced = syncAdapters(outDir, { force: Boolean(opts.force) })
            for (const file of synced.written) console.log(`  Adapter: ${file}`)
            for (const file of synced.skipped) console.log(`  Adapter skipped: ${file}`)
          }
          return
        }
        // Safe write: update AGENTS.md only when the source YAML really changed.
        // Never blindly replace; the project's context (PROJECT_MEMORY.md,
        // CHANGE_CONTROL.md, idea.md, plan.md) is owned by init/memory and is
        // never touched here.
      }

      const dir = dirname(outPath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(outPath, result.content, "utf-8")
      console.log(`Generated ${result.file} for: ${config.project.name}`)

      if (removeObsoleteStartPromptFile(outDir)) {
        console.log(`  Removed obsolete LOOP_START_PROMPT.txt (load AGENTS.md only)`)
      }

      if (opts.adapters) {
        const synced = syncAdapters(outDir, { force: Boolean(opts.force) })
        for (const file of synced.written) console.log(`  Adapter: ${file}`)
        for (const file of synced.skipped) console.log(`  Adapter skipped: ${file}`)
      }

      if (opts.initMemory && config.multi_agent?.memory?.enabled) {
        const project = detectProject(resolve("."))
        ensureMemory(resolve("."), project)
      }
    } catch (e) {
      if (e instanceof ParseError) {
        console.error(`Error: ${e.message}`)
        process.exit(1)
      }
      throw e
    }
  })

program
  .command("validate")
  .description(cmdDesc("validate", "Validate source YAML"))
  .argument("[source]", "Path to source YAML", "universal-agent.yaml")
  .action((source: string) => {
    try {
      const s = parseSource(source)
      console.log(`Valid: ${s.project.name}`)
      console.log(`  Stack:     ${s.project.stack.languages?.join(", ") ?? "not set"}`)
      console.log(`  Build:     ${s.build ? "configured" : "not set"}`)
      console.log(`  Testing:   ${s.testing ? "configured" : "not set"}`)
      console.log(`  Loop:      ${s.agent_loop ? "configured" : "not set"}`)
      console.log(`  Multi:     ${s.multi_agent ? "configured" : "not set"}`)
      console.log(`  Change:    ${s.change_control?.enabled === false ? "disabled" : "enabled"}`)
      console.log(`  Rules:     ${s.rules?.length ?? 0}`)
    } catch (e) {
      if (e instanceof ParseError) {
        console.error(`Invalid: ${e.message}`)
        process.exit(1)
      }
      throw e
    }
  })

program
  .command("upgrade")
  .description(cmdDesc("upgrade", "Migrate legacy memory and agent filenames"))
  .argument("[target]", "Target project directory", "..")
  .option("--dry-run", "Report without writing")
  .option("--yes", "Apply without an extra prompt")
  .option(
    "--prune",
    "DEPRECATED — ignored unless --i-accept-deletes. Policy: create/update/rename only (docs/file-lifecycle.md)",
  )
  .option(
    "--i-accept-deletes",
    "Dangerous: allow --prune to unlink legacy files. Prefer manual delete after rename.",
  )
  .option("--skip-agents-regen", "Do not rewrite AGENTS.md during upgrade (setup-all regenerates later)")
  .option("--batch-size <n>", "Discover/scan batch size", (v: string) => parseInt(v, 10))
  .action((
    target: string,
    opts: {
      dryRun?: boolean
      yes?: boolean
      prune?: boolean
      iAcceptDeletes?: boolean
      skipAgentsRegen?: boolean
      batchSize?: number
    },
  ) => {
    if (opts.prune && !opts.iAcceptDeletes) {
      console.warn(
        "  [POLICY] --prune ignored without --i-accept-deletes. Canon: create / update / rename — never delete.",
      )
    }
    const result = runUpgrade(resolve(target), {
      dryRun: Boolean(opts.dryRun),
      yes: Boolean(opts.yes),
      prune: Boolean(opts.prune),
      allowDeletes: Boolean(opts.iAcceptDeletes),
      regenerateAgents: opts.skipAgentsRegen ? false : undefined,
      batchSize: opts.batchSize,
    })
    console.log(formatUpgradeSummary(result))
    if (!result.report.verify.ok) process.exitCode = 1
  })

program
  .command("update")
  .description(cmdDesc("update", "Check origin for a newer version of this toolkit and fast-forward it"))
  .argument("[target]", "Toolkit directory (default: current folder)", ".")
  .option("--dry-run", "Only report the status, do not update")
  .option("--check", "Only report the status, do not update")
  .action((target: string, opts: { dryRun?: boolean; check?: boolean }) => {
    const root = resolve(target)
    const checkOnly = Boolean(opts.dryRun || opts.check)
    const result = checkOnly
      ? { check: checkSelfUpdate(root), applied: false, message: checkSelfUpdate(root).message }
      : applySelfUpdate(root)
    process.stdout.write(formatSelfUpdate(result, root))
    // Never fail the caller: an offline or non-git toolkit keeps its local version
  })

program
  .command("sync")
  .description(cmdDesc("sync", "Write multi-editor adapter files that point at AGENTS.md"))
  .argument("[target]", "Target project directory", "..")
  .option("--force", "Overwrite existing adapter files")
  .action((target: string, opts: { force?: boolean }) => {
    const synced = syncAdapters(resolve(target), { force: Boolean(opts.force) })
    for (const file of synced.written) console.log(`  Adapter: ${file}`)
    for (const file of synced.skipped) console.log(`  Adapter skipped: ${file}`)
  })

program
  .command("adopt")
  .description(cmdDesc("adopt", "Import existing editor instructions into universal-agent.yaml"))
  .argument("[target]", "Target project directory", "..")
  .option("-s, --source <file>", "Preferred instruction file")
  .option("--force", "Overwrite existing universal-agent.yaml")
  .action((target: string, opts: { source?: string; force?: boolean }) => {
    const result = adoptProject(resolve(target), {
      source: opts.source,
      forceYaml: Boolean(opts.force),
    })
    console.log(`  ${result.message}`)
  })

program
  .command("ensure-idea")
  .description(cmdDesc("ensure-idea", "Create idea.md from the template when the project has none"))
  .argument("[target]", "Target project directory", "..")
  .action((target: string) => {
    const result = ensureIdeaFile(resolve(target))
    console.log(`  ${result.message}`)
  })

program
  .command("plan-from")
  .description(cmdDesc("plan-from", "Turn an idea or plan file into phases in the project memory"))
  .argument("<idea>", "Idea or plan file, relative to the target")
  .argument("[target]", "Target project directory", "..")
  .option(
    "--force",
    "Replace an existing ## Phases checklist (default: keep existing phases / checkmarks)",
  )
  .action((idea: string, target: string, opts: { force?: boolean }) => {
    try {
      const result = planFromIdea(resolve(target), idea, { force: Boolean(opts.force) })
      console.log(`  ${result.message}`)
      if (result.skipped) process.exitCode = 0
    } catch (e) {
      console.error(`  [WARN] ${(e as Error).message}`)
      process.exitCode = 1
    }
  })

program
  .command("write-prompt")
  .description(
    cmdDesc(
      "write-prompt",
      "Remove obsolete LOOP_START_PROMPT.txt (load AGENTS.md is enough; no paste file)",
    ),
  )
  .argument("[target]", "Target project directory", "..")
  .action((target: string) => {
    const root = resolve(target)
    if (removeObsoleteStartPromptFile(root)) {
      console.log(`  Removed obsolete LOOP_START_PROMPT.txt (load AGENTS.md only)`)
    } else {
      console.log(`  No LOOP_START_PROMPT.txt — OK (loop activates by loading AGENTS.md)`)
    }
  })

program
  .command("doctor")
  .description(cmdDesc("doctor", "Readiness check for the agent loop"))
  .argument("[target]", "Target project directory", "..")
  .action((target: string) => {
    const report = runDoctor(resolve(target))
    console.log(formatDoctorReport(report))
    if (report.score < report.max) process.exitCode = 1
  })

program
  .command("verify")
  .description(cmdDesc("verify", "Self-check: docs/scripts vs registered CLI commands"))
  .argument("[target]", "Toolkit directory (default: .)", ".")
  .action((target: string) => {
    const report = runVerify(resolve(target))
    console.log(formatVerifyReport(report))
    if (!report.ok) process.exitCode = 1
  })

program
  .command("reconcile")
  .description(cmdDesc("reconcile", "Write AGENTS_RECONCILE.md when AGENTS.md is stale"))
  .argument("[target]", "Target project directory", "..")
  .action((target: string) => {
    const report = runReconcile(resolve(target))
    console.log(formatReconcileReport(report))
  })

program
  .command("coord:register")
  .description(cmdDesc("coord:register", "Register an agent session"))
  .argument("[target]", "Target project directory", ".")
  .requiredOption("-n, --name <name>", "Agent display name")
  .requiredOption("-i, --ide <ide>", "Editor / IDE id (cursor, claude, copilot, …)")
  .action((target: string, opts: { name: string; ide: string }) => {
    const agent = registerAgent(resolve(target), opts.name, opts.ide)
    console.log(`  Registered agentId=${agent.id}`)
    console.log(`  Keep this id for lock/claim/heartbeat in this chat.`)
  })

program
  .command("coord:unregister")
  .description(cmdDesc("coord:unregister", "Unregister agent and release locks/claims"))
  .argument("[target]", "Target project directory", ".")
  .requiredOption("--agent-id <id>", "Agent id from coord:register")
  .action((target: string, opts: { agentId: string }) => {
    const ok = unregisterAgent(resolve(target), opts.agentId)
    console.log(ok ? `  Unregistered ${opts.agentId}` : `  [WARN] agent not found: ${opts.agentId}`)
  })

program
  .command("coord:heartbeat")
  .description(cmdDesc("coord:heartbeat", "Renew lock/claim TTL"))
  .argument("[target]", "Target project directory", ".")
  .requiredOption("--agent-id <id>", "Agent id")
  .action((target: string, opts: { agentId: string }) => {
    const ok = heartbeatAgent(resolve(target), opts.agentId)
    console.log(ok ? `  Heartbeat OK for ${opts.agentId}` : `  [FAIL] unknown agent ${opts.agentId}`)
    if (!ok) process.exitCode = 1
  })

program
  .command("coord:lock")
  .description(cmdDesc("coord:lock", "Acquire file locks"))
  .argument("[target]", "Target project directory", ".")
  .requiredOption("--agent-id <id>", "Agent id")
  .requiredOption("--files <files>", "Comma-separated relative file paths")
  .option("--phase <phase>", "Phase title being worked")
  .option("--ttl-min <n>", "TTL minutes", (v: string) => parseInt(v, 10))
  .action((target: string, opts: { agentId: string; files: string; phase?: string; ttlMin?: number }) => {
    const root = resolve(target)
    const files = opts.files.split(",").map((f) => f.trim()).filter(Boolean)
    const ttlMs = opts.ttlMin ? opts.ttlMin * 60_000 : DEFAULT_LOCK_TTL_MS
    let failed = false
    for (const file of files) {
      const r = tryAcquireLock(root, file, opts.agentId, { ttlMs, phase: opts.phase })
      if (r.success) console.log(`  [OK] locked ${file}`)
      else {
        failed = true
        console.log(`  [!!] ${file}: ${r.reason}`)
      }
    }
    if (failed) process.exitCode = 1
  })

program
  .command("coord:unlock")
  .description(cmdDesc("coord:unlock", "Release file locks"))
  .argument("[target]", "Target project directory", ".")
  .requiredOption("--agent-id <id>", "Agent id")
  .option("--files <files>", "Comma-separated paths (default: all held by agent)")
  .action((target: string, opts: { agentId: string; files?: string }) => {
    const root = resolve(target)
    const held = listLocks(root).filter((l) => l.agentId === opts.agentId).map((l) => l.file)
    const files = opts.files
      ? opts.files.split(",").map((f) => f.trim()).filter(Boolean)
      : held
    for (const file of files) {
      const ok = releaseLock(root, file, opts.agentId)
      console.log(ok ? `  [OK] unlocked ${file}` : `  [!!] could not unlock ${file}`)
    }
  })

program
  .command("coord:locks")
  .description(cmdDesc("coord:locks", "List file locks"))
  .argument("[target]", "Target project directory", ".")
  .action((target: string) => {
    const locks = listLocks(resolve(target))
    if (!locks.length) {
      console.log("  No locks.")
      return
    }
    for (const l of locks) {
      const stale = isLockStale(l) ? "STALE" : "live"
      console.log(`  [${stale}] ${l.file} — ${l.owner} (${l.agentId}) phase=${l.phase ?? "—"} hb=${l.heartbeatAt}`)
    }
  })

program
  .command("coord:conflicts")
  .description(cmdDesc("coord:conflicts", "Check files for live foreign locks"))
  .argument("[target]", "Target project directory", ".")
  .requiredOption("--agent-id <id>", "Your agent id")
  .requiredOption("--files <files>", "Comma-separated relative paths")
  .action((target: string, opts: { agentId: string; files: string }) => {
    const files = opts.files.split(",").map((f) => f.trim()).filter(Boolean)
    const conflicts = findConflicts(resolve(target), opts.agentId, files)
    if (!conflicts.length) {
      console.log("  No conflicts.")
      return
    }
    for (const c of conflicts) {
      console.log(`  [!!] ${c.file} locked by ${c.lock.owner} (${c.lock.agentId})`)
    }
    process.exitCode = 1
  })

program
  .command("coord:cleanup")
  .description(cmdDesc("coord:cleanup", "Remove stale locks and claims"))
  .argument("[target]", "Target project directory", ".")
  .action((target: string) => {
    const root = resolve(target)
    const locks = cleanupStaleLocks(root)
    const claims = cleanupStaleClaims(root)
    console.log(`  Stale locks removed: ${locks.length}`)
    for (const f of locks) console.log(`    - ${f}`)
    console.log(`  Stale claims removed: ${claims.length}`)
    for (const p of claims) console.log(`    - ${p}`)
  })

program
  .command("coord:claim")
  .description(cmdDesc("coord:claim", "Claim a phase in PROJECT_MEMORY.md"))
  .argument("[target]", "Target project directory", ".")
  .requiredOption("--agent-id <id>", "Agent id")
  .requiredOption("--phase <phase>", "Phase title (must match a phase line intent)")
  .option("--files <files>", "Comma-separated files for this phase")
  .action((target: string, opts: { agentId: string; phase: string; files?: string }) => {
    const files = opts.files ? opts.files.split(",").map((f) => f.trim()).filter(Boolean) : []
    const r = claimPhase(resolve(target), opts.agentId, opts.phase, files)
    if (r.success) console.log(`  [OK] claimed phase "${opts.phase}"`)
    else {
      console.log(`  [!!] ${r.reason}`)
      process.exitCode = 1
    }
  })

program
  .command("coord:claim:release")
  .description(cmdDesc("coord:claim:release", "Release a phase claim"))
  .argument("[target]", "Target project directory", ".")
  .requiredOption("--agent-id <id>", "Agent id")
  .requiredOption("--phase <phase>", "Phase title")
  .action((target: string, opts: { agentId: string; phase: string }) => {
    const ok = releasePhaseClaim(resolve(target), opts.agentId, opts.phase)
    console.log(ok ? `  [OK] released claim "${opts.phase}"` : `  [WARN] release failed`)
  })

program.parse()
