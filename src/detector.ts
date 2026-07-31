import { readFileSync, readdirSync, existsSync, statSync } from "node:fs"
import { resolve, join, basename, extname } from "node:path"

export interface DetectedProject {
  name: string
  root: string
  /** Short description from README / package.json when available */
  description?: string
  languages: string[]
  frameworks: string[]
  runtime: string[]
  packageManagers: string[]
  databases: string[]
  /** Top-level module folders under src/app/lib (light layout scan) */
  topModules: string[]
  /** package.json script names (actual keys present) */
  scriptNames: string[]
  /** One-line portable layout hints for agents */
  layoutHints: string[]
  buildCommands: {
    install?: string
    dev?: string
    build?: string
    lint?: string
    typecheck?: string
    test?: string
    format?: string
  }
  hasGit: boolean
}

const SKIP_NAMES = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  ".git",
  ".next",
  ".nuxt",
  ".turbo",
  "__pycache__",
  "vendor",
  "target",
])

const EXT_LANG: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
  ".rb": "ruby",
  ".java": "java",
  ".kt": "kotlin",
  ".swift": "swift",
  ".c": "c",
  ".cpp": "cpp",
  ".cs": "csharp",
  ".php": "php",
  ".lua": "lua",
  ".zig": "zig",
  ".ex": "elixir",
  ".exs": "elixir",
  ".hs": "haskell",
  ".clj": "clojure",
  ".vue": "vue",
  ".svelte": "svelte",
}

function readFileJSON(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"))
  } catch {
    return null
  }
}

function safeReaddir(dir: string): string[] {
  try {
    return readdirSync(dir)
  } catch {
    return []
  }
}

/** README.md / readme.md / README — first useful paragraph, max ~240 chars. */
export function readReadmeSummary(root: string): string | undefined {
  const candidates = ["README.md", "readme.md", "README", "Readme.md"]
  for (const name of candidates) {
    const full = join(root, name)
    if (!existsSync(full)) continue
    try {
      const raw = readFileSync(full, "utf-8")
      const lines = raw.split(/\r?\n/)
      const chunks: string[] = []
      for (const line of lines) {
        const t = line.trim()
        if (!t) {
          if (chunks.length) break
          continue
        }
        if (t.startsWith("#")) continue
        if (t.startsWith("```") || t.startsWith("---") || t.startsWith("|")) continue
        if (t.startsWith("![") || t.startsWith("[!")) continue
        chunks.push(t.replace(/^>\s*/, ""))
        if (chunks.join(" ").length > 200) break
      }
      const summary = chunks.join(" ").replace(/\s+/g, " ").trim()
      if (summary.length >= 20) return summary.slice(0, 240)
    } catch {
      continue
    }
  }
  return undefined
}

function addLangFromName(langs: Set<string>, name: string): void {
  const ext = extname(name).toLowerCase()
  if (EXT_LANG[ext]) langs.add(EXT_LANG[ext])
}

/** Walk root + src/app/lib up to depth 2 for language extensions (no heavy deps). */
function detectLanguages(root: string): string[] {
  const langs = new Set<string>()
  const roots = [
    root,
    join(root, "src"),
    join(root, "app"),
    join(root, "lib"),
    join(root, "backend"),
    join(root, "frontend"),
  ]

  for (const dir of roots) {
    if (!existsSync(dir)) continue
    for (const name of safeReaddir(dir)) {
      if (SKIP_NAMES.has(name) || name.startsWith(".")) continue
      const full = join(dir, name)
      let st
      try {
        st = statSync(full)
      } catch {
        continue
      }
      if (st.isFile()) {
        addLangFromName(langs, name)
        continue
      }
      if (!st.isDirectory()) continue
      for (const child of safeReaddir(full)) {
        if (SKIP_NAMES.has(child) || child.startsWith(".")) continue
        const childFull = join(full, child)
        try {
          if (statSync(childFull).isFile()) addLangFromName(langs, child)
        } catch {
          continue
        }
      }
    }
  }

  return [...langs]
}

/** First-level folders under common source roots. */
export function detectTopModules(root: string): string[] {
  const modules: string[] = []
  const bases = ["src", "app", "lib", "backend", "frontend", "packages"]

  for (const base of bases) {
    const dir = join(root, base)
    if (!existsSync(dir)) continue
    for (const name of safeReaddir(dir)) {
      if (SKIP_NAMES.has(name) || name.startsWith(".")) continue
      const full = join(dir, name)
      try {
        if (statSync(full).isDirectory()) modules.push(`${base}/${name}`)
      } catch {
        continue
      }
    }
  }

  return [...new Set(modules)].slice(0, 40)
}

function detectFrameworks(pkg: Record<string, unknown> | null): string[] {
  const frameworks: string[] = []
  if (!pkg) return frameworks

  const allDeps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  }

  const frameworkMap: Record<string, string> = {
    react: "react",
    "react-dom": "react",
    vue: "vue",
    "@vue/cli-service": "vue",
    next: "nextjs",
    nuxt: "nuxt",
    "@angular/core": "angular",
    svelte: "svelte",
    express: "express",
    fastify: "fastify",
    koa: "koa",
    hono: "hono",
    nest: "nestjs",
    "@nestjs/core": "nestjs",
    django: "django",
    flask: "flask",
    fastapi: "fastapi",
    gin: "gin",
    echo: "echo",
    fiber: "fiber",
    actix: "actix",
    axum: "axum",
    rails: "rails",
    sinatra: "sinatra",
    laravel: "laravel",
    spring: "spring",
  }

  for (const dep of Object.keys(allDeps)) {
    if (frameworkMap[dep]) frameworks.push(frameworkMap[dep])
  }

  return [...new Set(frameworks)]
}

function detectRuntime(pkg: Record<string, unknown> | null, root: string): string[] {
  const runtime: string[] = []

  if (existsSync(join(root, "bun.lockb")) || existsSync(join(root, "bun.lock"))) {
    runtime.push("bun")
  }

  if (pkg?.engines) {
    const engines = pkg.engines as Record<string, string>
    if (engines.node) runtime.push("node")
    if (engines.bun) runtime.push("bun")
    if (engines.deno) runtime.push("deno")
  }

  if (existsSync(join(root, "requirements.txt")) || existsSync(join(root, "pyproject.toml"))) {
    runtime.push("python")
  }

  if (existsSync(join(root, "go.mod"))) runtime.push("go")
  if (existsSync(join(root, "Cargo.toml"))) runtime.push("rust")
  if (existsSync(join(root, "Gemfile"))) runtime.push("ruby")

  if (!runtime.length && existsSync(join(root, "package.json"))) runtime.push("node")

  return [...new Set(runtime)]
}

function detectPackageManagers(root: string): string[] {
  const managers: string[] = []

  if (existsSync(join(root, "bun.lockb")) || existsSync(join(root, "bun.lock"))) managers.push("bun")
  if (existsSync(join(root, "package-lock.json"))) managers.push("npm")
  if (existsSync(join(root, "yarn.lock"))) managers.push("yarn")
  if (existsSync(join(root, "pnpm-lock.yaml"))) managers.push("pnpm")
  if (existsSync(join(root, "requirements.txt"))) managers.push("pip")
  if (existsSync(join(root, "poetry.lock")) || existsSync(join(root, "pyproject.toml"))) {
    managers.push("poetry")
  }
  if (existsSync(join(root, "go.sum"))) managers.push("go")
  if (existsSync(join(root, "Cargo.lock"))) managers.push("cargo")
  if (existsSync(join(root, "Gemfile.lock"))) managers.push("bundler")

  if (!managers.length && existsSync(join(root, "package.json"))) managers.push("npm")

  return [...new Set(managers)]
}

function detectDatabases(root: string, pkg: Record<string, unknown> | null): string[] {
  const dbs = new Set<string>()

  for (const dcPath of [join(root, "docker-compose.yml"), join(root, "docker-compose.yaml")]) {
    if (!existsSync(dcPath)) continue
    try {
      const content = readFileSync(dcPath, "utf-8").toLowerCase()
      if (content.includes("postgres")) dbs.add("postgresql")
      if (content.includes("mysql")) dbs.add("mysql")
      if (content.includes("mongo")) dbs.add("mongodb")
      if (content.includes("redis")) dbs.add("redis")
      if (content.includes("sqlite")) dbs.add("sqlite")
    } catch {}
  }

  if (pkg) {
    const allDeps = {
      ...(pkg.dependencies as Record<string, string> | undefined),
      ...(pkg.devDependencies as Record<string, string> | undefined),
    }
    const depMap: Record<string, string> = {
      pg: "postgresql",
      postgres: "postgresql",
      mysql: "mysql",
      mysql2: "mysql",
      mongodb: "mongodb",
      mongoose: "mongodb",
      ioredis: "redis",
      redis: "redis",
      sqlite3: "sqlite",
      "better-sqlite3": "sqlite",
      "@prisma/client": "prisma",
      prisma: "prisma",
    }
    for (const dep of Object.keys(allDeps)) {
      if (depMap[dep]) dbs.add(depMap[dep])
    }
  }

  if (existsSync(join(root, "prisma")) || existsSync(join(root, "prisma", "schema.prisma"))) {
    dbs.add("prisma")
  }

  return [...dbs]
}

function preferredPackageManager(managers: string[]): string {
  const order = ["bun", "pnpm", "yarn", "npm"]
  for (const m of order) {
    if (managers.includes(m)) return m
  }
  return "npm"
}

function runScript(manager: string, script: string): string {
  if (manager === "bun") return `bun run ${script}`
  if (manager === "pnpm") return `pnpm run ${script}`
  if (manager === "yarn") return `yarn ${script}`
  if (script === "test") return "npm test"
  return `npm run ${script}`
}

function installCommand(manager: string): string {
  if (manager === "bun") return "bun install"
  if (manager === "pnpm") return "pnpm install"
  if (manager === "yarn") return "yarn"
  return "npm install"
}

function detectBuildCommands(
  pkg: Record<string, unknown> | null,
  root: string,
  managers: string[],
): DetectedProject["buildCommands"] {
  const cmds: DetectedProject["buildCommands"] = {}
  const manager = preferredPackageManager(managers)

  if (pkg) cmds.install = installCommand(manager)

  if (pkg?.scripts) {
    const scripts = pkg.scripts as Record<string, string>
    if (scripts.dev) cmds.dev = runScript(manager, "dev")
    if (scripts.build) cmds.build = runScript(manager, "build")
    if (scripts.lint) cmds.lint = runScript(manager, "lint")
    if (scripts.test) cmds.test = runScript(manager, "test")
    if (scripts.typecheck || scripts["type-check"]) {
      cmds.typecheck = runScript(manager, scripts.typecheck ? "typecheck" : "type-check")
    }
    if (scripts.format || scripts.prettier) {
      cmds.format = runScript(manager, scripts.format ? "format" : "prettier")
    }
  }

  if (existsSync(join(root, "Makefile"))) {
    try {
      const makefile = readFileSync(join(root, "Makefile"), "utf-8")
      if (makefile.includes("dev:") && !cmds.dev) cmds.dev = "make dev"
      if (makefile.includes("build:") && !cmds.build) cmds.build = "make build"
      if (makefile.includes("test:") && !cmds.test) cmds.test = "make test"
      if (makefile.includes("lint:") && !cmds.lint) cmds.lint = "make lint"
    } catch {}
  }

  if (existsSync(join(root, "go.mod"))) {
    if (!cmds.build) cmds.build = "go build ./..."
    if (!cmds.test) cmds.test = "go test ./..."
    if (!cmds.lint) cmds.lint = "golangci-lint run"
  }

  if (existsSync(join(root, "Cargo.toml"))) {
    if (!cmds.build) cmds.build = "cargo build"
    if (!cmds.test) cmds.test = "cargo test"
    if (!cmds.lint) cmds.lint = "cargo clippy"
  }

  if (existsSync(join(root, "pyproject.toml"))) {
    if (!cmds.test) cmds.test = "pytest"
    if (!cmds.lint) cmds.lint = "ruff check ."
    if (!cmds.format) cmds.format = "ruff format ."
  }

  return cmds
}

function buildLayoutHints(root: string, topModules: string[], scriptNames: string[]): string[] {
  const hints: string[] = []
  if (existsSync(join(root, "src"))) hints.push("Source root: src/")
  if (existsSync(join(root, "app"))) hints.push("App router/root: app/")
  if (existsSync(join(root, "packages"))) hints.push("Monorepo-style packages/ present")
  if (topModules.length) {
    hints.push(
      `Top modules: ${topModules.slice(0, 12).join(", ")}${topModules.length > 12 ? ", …" : ""}`,
    )
  }
  if (scriptNames.length) {
    hints.push(
      `Scripts: ${scriptNames.slice(0, 15).join(", ")}${scriptNames.length > 15 ? ", …" : ""}`,
    )
  }
  return hints
}

export function detectProject(targetDir: string): DetectedProject {
  const root = resolve(targetDir)
  const pkg = readFileJSON(join(root, "package.json"))
  const projectName = (pkg?.name as string) || basename(root)
  const packageManagers = detectPackageManagers(root)
  const topModules = detectTopModules(root)
  const scriptNames = pkg?.scripts ? Object.keys(pkg.scripts as Record<string, string>) : []
  const readme = readReadmeSummary(root)
  const pkgDescription = typeof pkg?.description === "string" ? pkg.description.trim() : undefined

  return {
    name: projectName,
    root,
    description: readme || pkgDescription || undefined,
    languages: detectLanguages(root),
    frameworks: detectFrameworks(pkg),
    runtime: detectRuntime(pkg, root),
    packageManagers,
    databases: detectDatabases(root, pkg),
    topModules,
    scriptNames,
    layoutHints: buildLayoutHints(root, topModules, scriptNames),
    buildCommands: detectBuildCommands(pkg, root, packageManagers),
    hasGit: existsSync(join(root, ".git")),
  }
}
