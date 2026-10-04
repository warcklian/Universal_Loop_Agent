import { copyFileSync, existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

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

/** Prompt users paste into the AI chat after setup-all. */
export function loopStartPrompt(): string {
  return [
    "Load AGENTS.md (loop mode).",
    "Read PROJECT_MEMORY.md and idea.md (or the plan).",
    "Implement the project phase by phase until all phases are done.",
    "For each phase: implement → run tests/checks → mark the phase done in PROJECT_MEMORY.md → continue to the next phase.",
    "Do not ask me to say continue between successful phases.",
    "Only stop if blocked (secrets, irreversible action, real ambiguity, or doom-loop).",
    "If this chat is a resume: do not redo completed phases; continue from the first unchecked phase in PROJECT_MEMORY.md.",
  ].join(" ")
}

export function writeStartPromptFile(targetDir: string): string {
  const root = resolve(targetDir)
  const out = join(root, "LOOP_START_PROMPT.txt")
  const body = [
    "# Copy everything below into your AI chat after loading AGENTS.md",
    "",
    loopStartPrompt(),
    "",
  ].join("\n")
  writeFileSync(out, body, "utf-8")
  return out
}

export function readTemplatePreview(): string {
  const p = ideaTemplatePath()
  if (!existsSync(p)) return ""
  return readFileSync(p, "utf-8").slice(0, 200)
}
