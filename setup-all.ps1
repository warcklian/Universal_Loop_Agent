# Universal Loop Agent - setup-all
# Single entry point for all users (parent project = ..)

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   Universal Loop Agent - setup-all" -ForegroundColor Cyan
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "  Single entry point for all users." -ForegroundColor Gray
Write-Host "  Target project: parent folder (..)" -ForegroundColor Gray
Write-Host ""

Set-Location -Path $PSScriptRoot

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "  [0a/6] Bun not found — installing via bun.sh..." -ForegroundColor White
    Write-Host ""
    try {
        Invoke-RestMethod https://bun.sh/install.ps1 | Invoke-Expression
    } catch {
        Write-Host "  [ERROR] Bun auto-install failed: $_" -ForegroundColor Red
        Write-Host "  Manual: powershell -c `"irm https://bun.sh/install.ps1 | iex`"" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "  Press Enter to exit"
        exit 1
    }
    $bunBin = Join-Path $env:USERPROFILE ".bun\bin"
    if (Test-Path $bunBin) {
        $env:Path = "$bunBin;$env:Path"
    }
    if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
        Write-Host "  [ERROR] Bun installed but not on PATH in this session." -ForegroundColor Red
        Write-Host "  Close this window, open a new terminal, and re-run setup-all.ps1" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "  Press Enter to exit"
        exit 1
    }
    Write-Host "  [OK] Bun is available." -ForegroundColor Green
    Write-Host ""
}

Write-Host "  [0b/8] Update — checking for a newer toolkit version..." -ForegroundColor White
Write-Host ""
bun run src/cli.ts update .
Write-Host ""

if (-not (Test-Path "node_modules")) {
    Write-Host "  [0/8] Installing toolkit dependencies..." -ForegroundColor White
    bun install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERROR] Failed to install dependencies." -ForegroundColor Red
        Read-Host "  Press Enter to exit"
        exit 1
    }
    Write-Host ""
}

Write-Host "  [1/8] Verify — docs/scripts vs CLI surface..." -ForegroundColor White
Write-Host ""
bun run src/cli.ts verify .
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] verify reported surface gaps — aborting setup." -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}
Write-Host ""

Write-Host "  [2/8] Init — detect stack, YAML, PROJECT_MEMORY.md..." -ForegroundColor White
Write-Host ""
bun run src/cli.ts init ..
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] init failed." -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}
Write-Host ""

Write-Host "  [3/8] Upgrade — migrate legacy names/refs (no prune / no AGENTS rewrite)..." -ForegroundColor White
Write-Host ""
bun run src/cli.ts upgrade .. --dry-run --skip-agents-regen | Out-Null
bun run src/cli.ts upgrade .. --yes --skip-agents-regen
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [WARN] upgrade reported issues — continuing." -ForegroundColor Yellow
}
Write-Host ""

Write-Host "  [4/8] Idea — ensure idea.md template if missing..." -ForegroundColor White
Write-Host ""
bun run src/cli.ts ensure-idea ..
Write-Host ""

# Paths relative to parent target (..) — first match only; also accept *_Plan.md / *idea*
$idea = $null
Get-ChildItem -Path ".." -File -ErrorAction SilentlyContinue | ForEach-Object {
    if ($idea) { return }
    if ($_.Name -match '(?i)(^|[_-])(plan|idea)([_-]|\.|$)' -and $_.Extension -match '(?i)\.(md|txt)$') {
        $idea = $_.Name
    }
}

if ($idea) {
    Write-Host "  [5/8] plan-from - phases from $idea..." -ForegroundColor White
    Write-Host ""
    bun run src/cli.ts plan-from $idea ..
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [WARN] plan-from failed - continuing." -ForegroundColor Yellow
    }
    Write-Host ""
} else {
    Write-Host "  [5/8] plan-from - skipped" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "  [6/8] Generate — AGENTS.md + adapters (load AGENTS.md activates loop)..." -ForegroundColor White
Write-Host ""
if (-not (Test-Path "..\universal-agent.yaml")) {
    Write-Host "  [FAIL] universal-agent.yaml missing in parent after init." -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}
# AGENTS.md from YAML. Adapters: create missing only. Drops obsolete LOOP_START_PROMPT.txt.
bun run src/cli.ts generate ../universal-agent.yaml -o .. --adapters
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] generate failed." -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}
Write-Host ""

Write-Host "  [7/8] Reconcile — AGENTS contract brief (WARN continues)..." -ForegroundColor White
Write-Host ""
bun run src/cli.ts reconcile ..
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [WARN] reconcile reported issues — continuing." -ForegroundColor Yellow
}
Write-Host ""

Write-Host "  [8/8] Doctor — readiness check..." -ForegroundColor White
Write-Host ""
bun run src/cli.ts doctor ..
$doctorExit = $LASTEXITCODE
Write-Host ""

Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   Done — 3 steps left for you" -ForegroundColor Cyan
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Product files (PARENT folder):" -ForegroundColor White
Write-Host "    AGENTS.md              load this — loop activates (no paste)"
Write-Host "    PROJECT_MEMORY.md      portable memory / phases"
Write-Host "    CHANGE_CONTROL.md     change register (row before code, docs before implementing)"
Write-Host "    idea.md                edit your idea if needed"
Write-Host "    universal-agent.yaml   config (re-run setup-all after edits)"
Write-Host ""
Write-Host "  YOUR 3 STEPS:" -ForegroundColor Green
Write-Host "    1. Open the PARENT project in your AI editor"
Write-Host "    2. Load / attach AGENTS.md (the loop activates automatically — no prompt to paste)"
Write-Host "    3. Start implementing phase by phase"
Write-Host ""
Write-Host "  --------------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  POLICY (docs/file-lifecycle.md): create if missing / update features / rename legacy — NEVER delete." -ForegroundColor Gray
Write-Host "  Memory, CHANGE_CONTROL, idea, YAML, stamps: never wiped. Existing ## Phases checklist kept (no --force)." -ForegroundColor Gray
Write-Host "  Adapters: create-if-missing. LOOP_START_PROMPT.txt is obsolete and removed on generate." -ForegroundColor Gray
Write-Host "  AGENTS.md updates from YAML when content differs. upgrade: no --prune." -ForegroundColor Gray
Write-Host "  Re-run setup-all after editing idea.md or universal-agent.yaml." -ForegroundColor Gray
Write-Host "  --------------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host ""
if ($doctorExit -ne 0) {
    Write-Host "  [NOTE] doctor reported gaps — see tips above." -ForegroundColor Yellow
} else {
    Write-Host "  [OK] doctor score looks good." -ForegroundColor Green
}
Write-Host ""
Read-Host "  Press Enter to exit"
exit 0
