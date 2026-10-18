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
  /** Folder for multi-agent stubs (pointers). Default: .uagent/memory/ */
  path?: string
  auto_sync?: boolean
  /**
   * Canonical portable handoff Markdown at project root.
   * Default: PROJECT_MEMORY.md — agents must read/update this file, not only .uagent stubs.
   */
  canonical_file?: string
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

export interface ResearchConfig {
  enabled?: boolean
  methodology?: string
  /** Mark which model/agent performed the research so all agents know who did it. */
  investigator_mark?: string
  /** Another agent can verify this research and give its ok or feedback. */
  cross_validation?: string
  /** The resulting solution must be functional, not only valid on paper. */
  functional_proof?: string
}

export interface ValidationConfig {
  enabled?: boolean
  /** Review what is already closed: is it well done? Did any agent omit something? */
  closed_phase_review?: string
  /** If 2+ agents agree the implemented alternative is functional, the phase can be closed. */
  functional_not_just_validated?: string
  /** The agent is not the only judge of its own success. */
  independent_verifier?: string
}

export interface ContextPreservationConfig {
  enabled?: boolean
  mode?: "complement" | "update" | "complement_or_update"
  never_overwrite?: boolean
  protected_files?: string[]
  rule?: string
}

export interface OrchestrationConfig {
  parallel?: boolean
  /** Canonical persistent memory used as the shared coordinator (no extra files). */
  shared_memory?: string
  avoid_new_files?: boolean
  agents_share_state?: boolean
}

export interface MultiAgentConfig {
  enabled?: boolean
  memory?: MemoryConfig
  ownership?: OwnershipEntry[]
  conflict?: ConflictConfig
  orchestration?: OrchestrationConfig
}

export interface ScopedRule {
  name: string
  glob?: string
  instructions: string
  always_apply?: boolean
}

/** Local change control: register every change, document it in detail, then implement. */
export interface ChangeControlConfig {
  enabled?: boolean
  /** Register file at project root. Default: CHANGE_CONTROL.md */
  file?: string
  /** Sequential ID prefix for entries. Default: CH */
  id_prefix?: string
  /** Extra project-specific rules, appended after the canon rules. */
  rules?: string[]
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
  change_control?: ChangeControlConfig
  rules?: ScopedRule[]
  universal_instructions?: string
  research?: ResearchConfig
  validation?: ValidationConfig
  context_preservation?: ContextPreservationConfig
}

export interface GeneratorOutput {
  file: string
  content: string
}

export type GeneratorFn = (source: SourceConfig) => GeneratorOutput
