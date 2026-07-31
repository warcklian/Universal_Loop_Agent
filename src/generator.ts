import type { SourceConfig, GeneratorOutput } from "./schema.ts"
import {
  sectionOverview,
  sectionBuild,
  sectionTesting,
  sectionCodeStyle,
  sectionSecurity,
  sectionGit,
  sectionAgentLoop,
  sectionMultiAgent,
  sectionRules,
  sectionUniversal,
} from "./sections/index.ts"

function join(...sections: (string | null)[]): string {
  return sections.filter(Boolean).join("\n\n")
}

/** Optional agents.md v1.1-style frontmatter (ignored by most agents today; forward-compatible). */
export function buildFrontmatter(source: SourceConfig): string {
  const description = (source.project.description ?? source.project.name).replace(/\r?\n/g, " ").slice(0, 200)
  const tags = [
    ...(source.project.stack.languages ?? []),
    ...(source.project.stack.framework ?? []),
    ...(source.project.stack.runtime ?? []),
  ]
    .map((t) => t.toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean)
  const uniq = [...new Set(tags)]

  const lines = ["---", `description: ${JSON.stringify(description)}`]
  if (uniq.length) lines.push(`tags: [${uniq.map((t) => JSON.stringify(t)).join(", ")}]`)
  lines.push("---", "")
  return lines.join("\n")
}

export function generate(source: SourceConfig): GeneratorOutput {
  const content = join(
    sectionOverview(source),
    sectionBuild(source),
    sectionTesting(source),
    sectionCodeStyle(source),
    sectionSecurity(source),
    sectionGit(source),
    sectionAgentLoop(source),
    sectionMultiAgent(source),
    sectionRules(source),
    sectionUniversal(source),
  )

  return {
    file: "AGENTS.md",
    content: buildFrontmatter(source) + content + "\n",
  }
}
