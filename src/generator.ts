import type { SourceConfig, GeneratorOutput } from "./schema.ts"
import {
  sectionOverview,
  sectionBuild,
  sectionTesting,
  sectionCodeStyle,
  sectionSecurity,
  sectionGit,
  sectionChangeControl,
  sectionAgentLoop,
  sectionMultiAgent,
  sectionAutonomousDelivery,
  sectionRules,
  sectionUniversal,
} from "./sections/index.ts"

function join(...sections: (string | null)[]): string {
  return sections.filter(Boolean).join("\n\n")
}

/** YAML frontmatter so editors can classify the generated file (optional but expected). */
function frontmatter(s: SourceConfig): string {
  const stack = s.project.stack
  const description = s.project.description || `${s.project.name} — agent configuration`
  const tags = [
    ...(stack.languages ?? []),
    ...(stack.framework ?? []),
    ...(stack.runtime ?? []),
  ]
  const tagLines = (tags.length ? tags : ["agents", "loop"]).map((t) => `  - ${t}`)
  return ["---", `description: ${JSON.stringify(description)}`, "tags:", ...tagLines, "---", ""].join("\n")
}

export function generate(source: SourceConfig): GeneratorOutput {
  const content = join(
    sectionOverview(source),
    sectionBuild(source),
    sectionTesting(source),
    sectionCodeStyle(source),
    sectionSecurity(source),
    sectionGit(source),
    sectionChangeControl(source),
    sectionAgentLoop(source),
    sectionMultiAgent(source),
    sectionAutonomousDelivery(source),
    sectionRules(source),
    sectionUniversal(source),
  )

  return {
    file: "AGENTS.md",
    content: frontmatter(source) + content + "\n",
  }
}
