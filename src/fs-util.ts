import { readFileSync } from "node:fs"

/**
 * Text and JSON readers that tolerate the UTF-8 BOM.
 *
 * Windows tools (PowerShell `>` redirection, older Notepad, some editors) write a
 * leading `\uFEFF`. JSON.parse and YAML.parse reject it, and anchored regexes such
 * as the frontmatter check fail on it, so a BOM turns a perfectly valid file into
 * an "unreadable" one.
 */

/** Strip a single leading UTF-8 BOM. */
export function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "")
}

/** Read a text file without its BOM. Returns null when the file cannot be read. */
export function readTextFile(path: string): string | null {
  try {
    return stripBom(readFileSync(path, "utf-8"))
  } catch {
    return null
  }
}

/**
 * Read and parse a JSON file without its BOM.
 * Returns null when the file cannot be read or the JSON is invalid.
 */
export function readJsonFile<T = Record<string, unknown>>(path: string): T | null {
  const raw = readTextFile(path)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
