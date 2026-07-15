import YAML from "yaml"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type {
  SourceConfig,
  ProjectConfig,
  StackConfig,
  BuildConfig,
  TestingConfig,
  CodeStyleConfig,
  SecurityConfig,
  GitConfig,
  AgentLoopConfig,
  MultiAgentConfig,
  ScopedRule,
} from "./schema.ts"

export class ParseError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(field ? `${field}: ${message}` : message)
    this.name = "ParseError"
  }
}

function req<T>(value: T | undefined, field: string): T {
  if (value === undefined || value === null) {
    throw new ParseError(`Missing required field`, field)
  }
  return value
}

function str(val: unknown): string | undefined {
  return typeof val === "string" ? val : undefined
}

function num(val: unknown): number | undefined {
  return typeof val === "number" ? val : undefined
}

function bool(val: unknown): boolean | undefined {
  return typeof val === "boolean" ? val : undefined
}

function arr(val: unknown): string[] | undefined {
  return Array.isArray(val) ? val.filter((v) => typeof v === "string") : undefined
}

function obj(val: unknown): Record<string, unknown> | undefined {
  return val && typeof val === "object" && !Array.isArray(val) ? (val as Record<string, unknown>) : undefined
}

function validateProject(raw: Record<string, unknown>): ProjectConfig {
  const stackRaw = obj(raw["stack"])
  const stack: StackConfig = {
    languages: arr(stackRaw?.["languages"]),
    framework: arr(stackRaw?.["framework"]),
    runtime: arr(stackRaw?.["runtime"]),
    package_managers: arr(stackRaw?.["package_managers"]),
    databases: arr(stackRaw?.["databases"]),
  }
  return {
    name: req(str(raw["name"]), "project.name"),
    description: str(raw["description"]),
    stack,
  }
}

function validateBuild(raw: Record<string, unknown> | undefined): BuildConfig | undefined {
  if (!raw) return undefined
  return {
    install: str(raw["install"]),
    dev: str(raw["dev"]),
    build: str(raw["build"]),
    lint: str(raw["lint"]),
    typecheck: str(raw["typecheck"]),
    format: str(raw["format"]),
    preview: str(raw["preview"]),
  }
}

function validateTesting(raw: Record<string, unknown> | undefined): TestingConfig | undefined {
  if (!raw) return undefined
  return {
    unit: str(raw["unit"]),
    e2e: str(raw["e2e"]),
    integration: str(raw["integration"]),
    coverage: str(raw["coverage"]),
    lint: str(raw["lint"]),
  }
}

function validateCodeStyle(raw: Record<string, unknown> | undefined): CodeStyleConfig | undefined {
  if (!raw) return undefined
  return {
    indent: num(raw["indent"]),
    quotes: (str(raw["quotes"]) as "single" | "double" | undefined) ?? undefined,
    semicolons: bool(raw["semicolons"]),
    max_line_length: num(raw["max_line_length"]),
    conventions: arr(raw["conventions"]),
  }
}

function validateSecurity(raw: Record<string, unknown> | undefined): SecurityConfig | undefined {
  if (!raw) return undefined
  return { rules: arr(raw["rules"]) }
}

function validateGit(raw: Record<string, unknown> | undefined): GitConfig | undefined {
  if (!raw) return undefined
  return {
    commit_format: (str(raw["commit_format"]) as GitConfig["commit_format"]) ?? undefined,
    branch_format: str(raw["branch_format"]),
    pr_template: str(raw["pr_template"]),
    rules: arr(raw["rules"]),
  }
}

function validateAgentLoop(raw: Record<string, unknown> | undefined): AgentLoopConfig | undefined {
  if (!raw) return undefined
  const rulesRaw = raw["rules"]
  const rules = Array.isArray(rulesRaw)
    ? rulesRaw.map((r) => {
        const rule = obj(r)
        return {
          instruction: req(str(rule?.["instruction"]) ?? str(r), "agent_loop.rules[].instruction"),
          description: str(rule?.["description"]),
        }
      })
    : undefined
  return {
    enabled: bool(raw["enabled"]),
    max_iterations: num(raw["max_iterations"]),
    timeout_seconds: num(raw["timeout_seconds"]),
    doom_loop_detection: bool(raw["doom_loop_detection"]),
    rules,
  }
}

function validateMultiAgent(raw: Record<string, unknown> | undefined): MultiAgentConfig | undefined {
  if (!raw) return undefined

  const memRaw = obj(raw["memory"])
  const memory = memRaw
    ? {
        enabled: bool(memRaw["enabled"]),
        path: str(memRaw["path"]),
        auto_sync: bool(memRaw["auto_sync"]),
      }
    : undefined

  const ownershipRaw = raw["ownership"]
  const ownership = Array.isArray(ownershipRaw)
    ? ownershipRaw.map((o) => {
        const entry = obj(o)
        return {
          agent: req(str(entry?.["agent"]), "multi_agent.ownership[].agent"),
          globs: req(arr(entry?.["globs"]), "multi_agent.ownership[].globs"),
          integrator: bool(entry?.["integrator"]),
        }
      })
    : undefined

  const conflictRaw = obj(raw["conflict"])
  const conflict = conflictRaw
    ? {
        file_locking: bool(conflictRaw["file_locking"]),
        auto_detect: bool(conflictRaw["auto_detect"]),
        strategy: (str(conflictRaw["strategy"]) as MultiAgentConfig["conflict"] extends { strategy?: infer S } ? S : never) ?? undefined,
      }
    : undefined

  return { enabled: bool(raw["enabled"]), memory, ownership, conflict }
}

function validateRules(raw: unknown[] | undefined): ScopedRule[] | undefined {
  if (!raw || !Array.isArray(raw)) return undefined
  return raw.map((r) => {
    const rule = obj(r)
    return {
      name: req(str(rule?.["name"]), "rules[].name"),
      glob: str(rule?.["glob"]),
      instructions: req(str(rule?.["instructions"]), "rules[].instructions"),
      always_apply: bool(rule?.["always_apply"]),
    }
  })
}

export function parseSource(filePath: string): SourceConfig {
  const resolved = resolve(filePath)
  let raw: string
  try {
    raw = readFileSync(resolved, "utf-8")
  } catch {
    throw new ParseError(`Cannot read file: ${resolved}`)
  }

  let parsed: unknown
  try {
    parsed = YAML.parse(raw)
  } catch (e) {
    throw new ParseError(`Invalid YAML: ${(e as Error).message}`)
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ParseError("Source file must be a YAML object at the top level")
  }

  const doc = parsed as Record<string, unknown>
  const projectRaw = obj(doc["project"])

  return {
    project: validateProject(projectRaw ?? {}),
    build: validateBuild(obj(doc["build"])),
    testing: validateTesting(obj(doc["testing"])),
    code_style: validateCodeStyle(obj(doc["code_style"])),
    security: validateSecurity(obj(doc["security"])),
    git: validateGit(obj(doc["git"])),
    agent_loop: validateAgentLoop(obj(doc["agent_loop"])),
    multi_agent: validateMultiAgent(obj(doc["multi_agent"])),
    rules: validateRules(doc["rules"] as unknown[] | undefined),
    universal_instructions: str(doc["universal_instructions"]),
  }
}
