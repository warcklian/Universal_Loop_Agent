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
    content: content + "\n",
  }
}
