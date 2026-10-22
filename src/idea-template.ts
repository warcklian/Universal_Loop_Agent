import { copyFileSync, existsSync, unlinkSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { readTextFile } from "./fs-util.ts"

/** Retired artefact — loop activates by loading AGENTS.md alone. */
export const OBSOLETE_START_PROMPT_FILE = "LOOP_START_PROMPT.txt"

const HERE = dirname(fileURLToPath(import.meta.url))

/** Bundled template lives at templates/idea.md next to the toolkit root. */
export function ideaTemplatePath(): string {
  return join(HERE, "..", "templates", "idea.md")
}

export const DEFAULT_IDEA_NAMES = ["idea.md", "IDEA.md", "plan.md", "PLAN.md", "idea.txt"] as const

export function findIdeaFile(targetDir: string): string | null {
  const root = resolve(targetDir)
  for (const name of DEFAULT_IDEA_NAMES) {
    const full = join(root, name)
    if (existsSync(full)) return full
  }
  return null
}

export interface EnsureIdeaResult {
  path: string
  created: boolean
  message: string
}

/**
 * Ensure the project has an idea.md (copy portable template if missing).
 * Never overwrites an existing idea/plan file.
 */
export function ensureIdeaFile(targetDir: string): EnsureIdeaResult {
  const root = resolve(targetDir)
  const existing = findIdeaFile(root)
  if (existing) {
    return {
      path: existing,
      created: false,
      message: `Idea/plan already present: ${existing}`,
    }
  }

  const dest = join(root, "idea.md")
  const template = ideaTemplatePath()
  if (existsSync(template)) {
    copyFileSync(template, dest)
  } else {
    // Fallback if template file is missing from a partial copy
    writeFileSync(
      dest,
      [
        "# Project idea",
        "",
        "## Goal",
        "",
        "_Describe what to build._",
        "",
        "## Must have",
        "",
        "1. _",
        "",
      ].join("\n"),
      "utf-8",
    )
  }

  return {
    path: dest,
    created: true,
    message: `Created idea.md from template — edit it, then re-run setup-all if you change phases`,
  }
}

/**
 * Remove obsolete `LOOP_START_PROMPT.txt` if present.
 * Loading AGENTS.md is enough to activate the loop — do not recreate this file.
 * @returns true when a file was deleted
 */
export function removeObsoleteStartPromptFile(targetDir: string): boolean {
  const path = join(resolve(targetDir), OBSOLETE_START_PROMPT_FILE)
  if (!existsSync(path)) return false
  unlinkSync(path)
  return true
}

export function readTemplatePreview(): string {
  const p = ideaTemplatePath()
  const raw = readTextFile(p)
  if (raw === null) return ""
  return raw.slice(0, 200)
}
