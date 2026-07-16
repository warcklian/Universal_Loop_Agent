import { writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import YAML from "yaml"
import type { DetectedProject } from "./detector.ts"

interface YamlConfig {
  project: {
    name: string
    description: string
    stack: {
      languages?: string[]
      framework?: string[]
      runtime?: string[]
      package_managers?: string[]
      databases?: string[]
    }
  }
  build: {
    install?: string
    dev?: string
    build?: string
    lint?: string
    typecheck?: string
    test?: string
    format?: string
  }
  testing: {
    unit?: string
    e2e?: string
    coverage?: string
  }
  code_style: {
    indent: number
    quotes: string
    semicolons: boolean
    max_line_length: number
    conventions: string[]
  }
  security: {
    rules: string[]
  }
  git: {
    commit_format: string
    rules: string[]
  }
  agent_loop: {
    enabled: boolean
    max_iterations: number
    timeout_seconds: number
    doom_loop_detection: boolean
    rules: Array<{
      instruction: string
      description: string
    }>
  }
  multi_agent: {
    enabled: boolean
    memory: {
      enabled: boolean
      path: string
      auto_sync: boolean
    }
    conflict: {
      file_locking: boolean
      auto_detect: boolean
      strategy: string
    }
  }
  universal_instructions: string
}

function detectConventions(project: DetectedProject): string[] {
  const convs: string[] = []

  if (project.languages.includes("typescript")) {
    convs.push("Use TypeScript strict mode")
  }

  if (project.frameworks.includes("react") || project.frameworks.includes("nextjs")) {
    convs.push("Use functional components with hooks")
    convs.push("Keep components small and focused")
  }

  if (project.frameworks.includes("vue")) {
    convs.push("Use Composition API")
    convs.push("Keep components small and focused")
  }

  if (project.frameworks.includes("express") || project.frameworks.includes("fastify") || project.frameworks.includes("hono")) {
    convs.push("Keep routes thin — delegate to services")
    convs.push("Validate all input at the boundary")
  }

  if (project.languages.includes("python")) {
    convs.push("Follow PEP 8 style guide")
    convs.push("Use type hints")
  }

  if (project.languages.includes("go")) {
    convs.push("Follow effective Go conventions")
    convs.push("Handle errors explicitly")
  }

  if (project.languages.includes("rust")) {
    convs.push("Use Result types for error handling")
    convs.push("Prefer composition over inheritance")
  }

  if (convs.length === 0) {
    convs.push("Keep functions small and focused")
    convs.push("Use descriptive variable and function names")
  }

  return convs
}

function detectTestCommand(project: DetectedProject): string | undefined {
  if (project.buildCommands.test) return project.buildCommands.test

  if (project.languages.includes("python")) return "pytest"
  if (project.languages.includes("go")) return "go test ./..."
  if (project.languages.includes("rust")) return "cargo test"

  return undefined
}

export function generateYaml(project: DetectedProject): YamlConfig {
  const conventions = detectConventions(project)
  const testCmd = detectTestCommand(project)

  const config: YamlConfig = {
    project: {
      name: project.name,
      description: `Project: ${project.name}`,
      stack: {},
    },
    build: {},
    testing: {},
    code_style: {
      indent: 2,
      quotes: "double",
      semicolons: project.languages.includes("typescript") || project.languages.includes("javascript"),
      max_line_length: 100,
      conventions,
    },
    security: {
      rules: [
        "Never commit secrets or API keys",
        "Use environment variables for configuration",
        "Validate all user input",
      ],
    },
    git: {
      commit_format: "conventional",
      rules: [
        "Write meaningful commit messages",
        "Keep commits atomic and focused",
      ],
    },
    agent_loop: {
      enabled: true,
      max_iterations: 15,
      timeout_seconds: 300,
      doom_loop_detection: true,
      rules: [
        {
          instruction: "Always read files before editing them",
          description: "Never edit blind — understand the current state first",
        },
        {
          instruction: "Run tests after every change",
          description: "Verify correctness immediately",
        },
        {
          instruction: "Run linter and type checker after edits",
          description: "Catch errors early",
        },
        {
          instruction: "If no progress in 3 iterations, stop and ask the user",
          description: "Prevent doom loops",
        },
        {
          instruction: "Explain what you changed and why",
          description: "Always report back with a summary",
        },
      ],
    },
    multi_agent: {
      enabled: true,
      memory: {
        enabled: true,
        path: ".uagent/memory/",
        auto_sync: true,
      },
      conflict: {
        file_locking: true,
        auto_detect: true,
        strategy: "topological",
      },
    },
    universal_instructions: `This project is ${project.name}.\nEdit universal-agent.yaml to configure everything.\nRun \`uagent generate\` to regenerate.\nLoad AGENTS.md in your agent to activate loop mode.`,
  }

  if (project.languages.length) config.project.stack.languages = project.languages
  if (project.frameworks.length) config.project.stack.framework = project.frameworks
  if (project.runtime.length) config.project.stack.runtime = project.runtime
  if (project.packageManagers.length) config.project.stack.package_managers = project.packageManagers
  if (project.databases.length) config.project.stack.databases = project.databases

  if (project.buildCommands.install) config.build.install = project.buildCommands.install
  if (project.buildCommands.dev) config.build.dev = project.buildCommands.dev
  if (project.buildCommands.build) config.build.build = project.buildCommands.build
  if (project.buildCommands.lint) config.build.lint = project.buildCommands.lint
  if (project.buildCommands.typecheck) config.build.typecheck = project.buildCommands.typecheck
  if (project.buildCommands.format) config.build.format = project.buildCommands.format

  if (testCmd) config.testing.unit = testCmd

  return config
}

export function writeYaml(targetDir: string, project: DetectedProject): void {
  const config = generateYaml(project)
  const yamlStr = YAML.stringify(config, {
    indent: 2,
    lineWidth: 120,
  })

  const header = [
    "# =============================================",
    `# universal-agent.yaml — ${project.name}`,
    "# Generated by uagent init",
    "# Edit this file, then run: uagent generate",
    "# =============================================",
    "",
  ].join("\n")

  writeFileSync(join(targetDir, "universal-agent.yaml"), header + yamlStr, "utf-8")
}
