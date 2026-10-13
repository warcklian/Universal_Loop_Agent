import { readFileSync, readdirSync, existsSync, statSync } from "node:fs"
import { resolve, join, basename } from "node:path"

export interface DetectedProject {
  name: string
  root: string
  /** One-line summary from README (or package.json) — feeds universal-agent.yaml description. */
  description?: string
  languages: string[]
  frameworks: string[]
  runtime: string[]
  packageManagers: string[]
  databases: string[]
  /** Top-level folders under the source root (e.g. src/cli, src/memory). */
  topModules: string[]
  /** Short structural hints (source root, docs folder, tests, workspaces). */
  layoutHints: string[]
  /** package.json script names. */
  scriptNames: string[]
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

function readFileJSON(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"))
  } catch {
    return null
  }
}

function detectLanguages(root: string): string[] {
  const langs = new Set<string>()
  const files = readdirSync(root).filter((f) => !f.startsWith(".") && f !== "node_modules")

  const extMap: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
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
  }

  for (const file of files) {
    const ext = "." + file.split(".").slice(1).join(".")
    if (extMap[ext]) langs.add(extMap[ext])
  }

  // Light deep scan: source-root files plus one folder level inside it (src/cli/*.ts)
  for (const sourceRoot of ["src", "lib", "app"]) {
    const sourcePath = join(root, sourceRoot)
    if (!existsSync(sourcePath)) continue
    try {
      for (const entry of readdirSync(sourcePath)) {
        const ext = "." + entry.split(".").slice(1).join(".")
        if (extMap[ext]) langs.add(extMap[ext])
        const subPath = join(sourcePath, entry)
        if (!statSync(subPath).isDirectory()) continue
        for (const nested of readdirSync(subPath)) {
          const nestedExt = "." + nested.split(".").slice(1).join(".")
          if (extMap[nestedExt]) langs.add(extMap[nestedExt])
        }
      }
    } catch {}
  }

  return [...langs]
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
  if (existsSync(join(root, "poetry.lock")) || existsSync(join(root, "pyproject.toml"))) managers.push("poetry")
  if (existsSync(join(root, "go.sum"))) managers.push("go")
  if (existsSync(join(root, "Cargo.lock"))) managers.push("cargo")
  if (existsSync(join(root, "Gemfile.lock"))) managers.push("bundler")

  if (!managers.length && existsSync(join(root, "package.json"))) managers.push("npm")

  return [...new Set(managers)]
}

function detectDatabases(root: string): string[] {
  const dbs: string[] = []

  const dockerCompose = join(root, "docker-compose.yml")
  const dockerComposeYaml = join(root, "docker-compose.yaml")

  for (const dcPath of [dockerCompose, dockerComposeYaml]) {
    if (existsSync(dcPath)) {
      try {
        const content = readFileSync(dcPath, "utf-8")
        if (content.includes("postgres")) dbs.push("postgresql")
        if (content.includes("mysql")) dbs.push("mysql")
        if (content.includes("mongo")) dbs.push("mongodb")
        if (content.includes("redis")) dbs.push("redis")
        if (content.includes("sqlite")) dbs.push("sqlite")
      } catch {}
    }
  }

  return [...new Set(dbs)]
}

/** Runner used for package.json scripts, derived from the lockfile actually present. */
function packageRunner(root: string): string {
  if (existsSync(join(root, "bun.lock")) || existsSync(join(root, "bun.lockb"))) return "bun"
  if (existsSync(join(root, "pnpm-lock.yaml"))) return "pnpm"
  if (existsSync(join(root, "yarn.lock"))) return "yarn"
  return "npm"
}

/** First meaningful README paragraph (skips title, badges and HTML blocks). */
function readmeSummary(text: string): string {
  const parts: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) {
      if (parts.length) break
      continue
    }
    if (line.startsWith("#")) continue
    if (line.startsWith("!") || line.startsWith("[!")) continue
    if (/^<[^>]+>$/.test(line) || /^<div|^<p align/i.test(line)) continue
    parts.push(line)
    if (parts.join(" ").length > 240) break
  }
  return parts.join(" ").trim().slice(0, 240)
}

function detectDescription(pkg: Record<string, unknown> | null, root: string): string {
  for (const name of ["README.md", "readme.md", "README.markdown", "README.txt", "README"]) {
    const path = join(root, name)
    if (!existsSync(path)) continue
    try {
      const summary = readmeSummary(readFileSync(path, "utf-8"))
      if (summary) return summary
    } catch {}
  }
  const pkgDescription = pkg?.["description"]
  return typeof pkgDescription === "string" ? pkgDescription.trim() : ""
}

function detectLayout(pkg: Record<string, unknown> | null, root: string): {
  topModules: string[]
  layoutHints: string[]
  scriptNames: string[]
} {
  const topModules: string[] = []
  const layoutHints: string[] = []

  const sourceRoot = ["src", "lib", "app"].find((dir) => existsSync(join(root, dir)))
  if (sourceRoot) {
    layoutHints.push(`Source root: ${sourceRoot}/`)
    try {
      for (const entry of readdirSync(join(root, sourceRoot))) {
        if (entry.startsWith(".") || entry === "node_modules") continue
        if (entry.lastIndexOf(".") > 0) continue // a file, not a module folder
        topModules.push(`${sourceRoot}/${entry}`)
      }
    } catch {}
  }

  if (existsSync(join(root, "docs"))) layoutHints.push("Docs folder: docs/")
  if (existsSync(join(root, "tests")) || existsSync(join(root, "test"))) layoutHints.push("Tests folder")
  const workspaces = pkg?.["workspaces"]
  if (Array.isArray(workspaces)) layoutHints.push(`Monorepo workspaces: ${workspaces.length}`)

  const scripts = pkg?.["scripts"]
  const scriptNames =
    scripts && typeof scripts === "object" && !Array.isArray(scripts)
      ? Object.keys(scripts as Record<string, unknown>)
      : []

  return { topModules, layoutHints, scriptNames }
}

function detectBuildCommands(
  pkg: Record<string, unknown> | null,
  root: string,
): DetectedProject["buildCommands"] {
  const cmds: DetectedProject["buildCommands"] = {}
  const runner = packageRunner(root)

  if (pkg) cmds.install = `${runner} install`

  if (pkg?.scripts) {
    const scripts = pkg.scripts as Record<string, string>
    if (scripts.dev) cmds.dev = `${runner} run dev`
    if (scripts.build) cmds.build = `${runner} run build`
    if (scripts.lint) cmds.lint = `${runner} run lint`
    if (scripts.test) cmds.test = `${runner} run test`
    if (scripts.typecheck || scripts["type-check"]) cmds.typecheck = `${runner} run ${scripts.typecheck ? "typecheck" : "type-check"}`
    if (scripts.format || scripts.prettier) cmds.format = `${runner} run ${scripts.format ? "format" : "prettier"}`
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

export function detectProject(targetDir: string): DetectedProject {
  const root = resolve(targetDir)
  const pkg = readFileJSON(join(root, "package.json"))
  const projectName = (pkg?.name as string) || basename(root)
  const layout = detectLayout(pkg, root)

  return {
    name: projectName,
    root,
    description: detectDescription(pkg, root),
    languages: detectLanguages(root),
    frameworks: detectFrameworks(pkg),
    runtime: detectRuntime(pkg, root),
    packageManagers: detectPackageManagers(root),
    databases: detectDatabases(root),
    topModules: layout.topModules,
    layoutHints: layout.layoutHints,
    scriptNames: layout.scriptNames,
    buildCommands: detectBuildCommands(pkg, root),
    hasGit: existsSync(join(root, ".git")),
  }
}
