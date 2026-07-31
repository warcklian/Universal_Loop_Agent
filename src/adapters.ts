import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

export interface AdapterFile {
  path: string
  content: string
  description: string
}

/**
 * Thin multi-editor adapters that point at root AGENTS.md.
 * Portable: relative references only; no absolute machine paths.
 * Product-owned files — toolkit folder is not required at runtime.
 */
export function buildAdapters(): AdapterFile[] {
  return [
    {
      path: "CLAUDE.md",
      description: "Claude Code pointer",
      content: [
        "# Claude Code",
        "",
        "Project instructions live in the universal agent file:",
        "",
        "@AGENTS.md",
        "",
        "Portable memory: `PROJECT_MEMORY.md` (read/update across sessions).",
        "",
      ].join("\n"),
    },
    {
      path: ".github/copilot-instructions.md",
      description: "GitHub Copilot pointer",
      content: [
        "# GitHub Copilot instructions",
        "",
        "Follow the repository root file `AGENTS.md` for build, test, style, loop, and memory rules.",
        "",
        "Also keep `PROJECT_MEMORY.md` updated after substantive phases.",
        "Do not treat any nested generator/toolkit folder as product application code.",
        "",
      ].join("\n"),
    },
    {
      path: ".gemini/settings.json",
      description: "Gemini CLI settings",
      content: JSON.stringify(
        {
          context: {
            fileName: "AGENTS.md",
          },
        },
        null,
        2,
      ) + "\n",
    },
    {
      path: ".cursorrules",
      description: "Cursor legacy rules pointer",
      content: [
        "# Cursor rules (pointer)",
        "",
        "Canonical agent instructions: AGENTS.md (load for loop mode).",
        "Canonical portable memory: PROJECT_MEMORY.md.",
        "Prefer AGENTS.md over duplicating rules here.",
        "",
      ].join("\n"),
    },
  ]
}

export interface SyncAdaptersResult {
  written: string[]
  skipped: string[]
}

export function syncAdapters(
  targetDir: string,
  opts: { force?: boolean } = {},
): SyncAdaptersResult {
  const root = resolve(targetDir)
  const written: string[] = []
  const skipped: string[] = []

  for (const adapter of buildAdapters()) {
    const full = join(root, adapter.path)
    if (existsSync(full) && !opts.force) {
      skipped.push(`${adapter.path} (exists — use --force)`)
      continue
    }
    const dir = dirname(full)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(full, adapter.content, "utf-8")
    written.push(adapter.path)
  }

  return { written, skipped }
}
