export interface ProjectConfig {
  name: string
  description?: string
  stack: StackConfig
}

export interface StackConfig {
  languages?: string[]
  framework?: string[]
  runtime?: string[]
  package_managers?: string[]
  databases?: string[]
}

export interface BuildConfig {
  install?: string
  dev?: string
  build?: string
  lint?: string
  typecheck?: string
  format?: string
  preview?: string
}

export interface TestingConfig {
  unit?: string
  e2e?: string
  integration?: string
  coverage?: string
  lint?: string
}

export interface CodeStyleConfig {
  indent?: number
  quotes?: "single" | "double"
  semicolons?: boolean
  max_line_length?: number
  conventions?: string[]
}

export interface SecurityConfig {
  rules?: string[]
}

export interface GitConfig {
  commit_format?: "conventional" | "angular" | "semantic" | "free"
  branch_format?: string
  pr_template?: string
  rules?: string[]
}

export interface AgentLoopRule {
  instruction: string
  description?: string
}

export interface AgentLoopConfig {
  enabled?: boolean
  max_iterations?: number
  timeout_seconds?: number
  doom_loop_detection?: boolean
  rules?: AgentLoopRule[]
}

export interface MemoryConfig {
  enabled?: boolean
  path?: string
  auto_sync?: boolean
}

export interface OwnershipEntry {
  agent: string
  globs: string[]
  integrator?: boolean
}

export interface ConflictConfig {
  file_locking?: boolean
  auto_detect?: boolean
  strategy?: "topological" | "sequential" | "worktree"
}

export interface MultiAgentConfig {
  enabled?: boolean
  memory?: MemoryConfig
  ownership?: OwnershipEntry[]
  conflict?: ConflictConfig
}

export interface ScopedRule {
  name: string
  glob?: string
  instructions: string
  always_apply?: boolean
}

export interface SourceConfig {
  project: ProjectConfig
  build?: BuildConfig
  testing?: TestingConfig
  code_style?: CodeStyleConfig
  security?: SecurityConfig
  git?: GitConfig
  agent_loop?: AgentLoopConfig
  multi_agent?: MultiAgentConfig
  rules?: ScopedRule[]
  universal_instructions?: string
}

export interface GeneratorOutput {
  file: string
  content: string
}

export type GeneratorFn = (source: SourceConfig) => GeneratorOutput
