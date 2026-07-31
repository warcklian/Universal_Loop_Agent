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

if (-not (Test-Path "node_modules")) {
    Write-Host "  [0/6] Installing toolkit dependencies..." -ForegroundColor White
    bun install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERROR] Failed to install dependencies." -ForegroundColor Red
        Read-Host "  Press Enter to exit"
        exit 1
    }
    Write-Host ""
}

Write-Host "  [1/6] Init — detect stack, YAML, PROJECT_MEMORY.md..." -ForegroundColor White
Write-Host ""
bun run src/cli.ts init ..
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] init failed." -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}
Write-Host ""

Write-Host "  [2/6] Upgrade — migrate legacy names/refs..." -ForegroundColor White
Write-Host ""
bun run src/cli.ts upgrade .. --dry-run | Out-Null
bun run src/cli.ts upgrade .. --yes --prune
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [WARN] upgrade reported issues — continuing." -ForegroundColor Yellow
}
Write-Host ""

Write-Host "  [3/6] Idea — ensure idea.md template if missing..." -ForegroundColor White
Write-Host ""
bun run src/cli.ts ensure-idea ..
Write-Host ""

# Paths relative to parent target (..) — not ..\ which would resolve to grandparent
$ideaCandidates = @("idea.md", "IDEA.md", "plan.md", "PLAN.md", "idea.txt")
$idea = $ideaCandidates | Where-Object { Test-Path (Join-Path ".." $_) } | Select-Object -First 1

if ($idea) {
    Write-Host "  [4/6] plan-from — phases from $idea..." -ForegroundColor White
    Write-Host ""
    bun run src/cli.ts plan-from $idea ..
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [WARN] plan-from failed — continuing." -ForegroundColor Yellow
    }
    Write-Host ""
} else {
    Write-Host "  [4/6] plan-from — skipped" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "  [5/6] Generate — AGENTS.md + adapters + start prompt..." -ForegroundColor White
Write-Host ""
if (-not (Test-Path "..\universal-agent.yaml")) {
    Write-Host "  [FAIL] universal-agent.yaml missing in parent after init." -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}
bun run src/cli.ts generate ../universal-agent.yaml -o .. --force --adapters
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] generate failed." -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}
bun run src/cli.ts write-prompt ..
Write-Host ""

Write-Host "  [6/6] Doctor — readiness check..." -ForegroundColor White
Write-Host ""
bun run src/cli.ts doctor ..
$doctorExit = $LASTEXITCODE
Write-Host ""

Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   Done — 3 steps left for you" -ForegroundColor Cyan
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Product files (PARENT folder):" -ForegroundColor White
Write-Host "    AGENTS.md              load this in the AI chat"
Write-Host "    PROJECT_MEMORY.md      portable memory / phases"
Write-Host "    idea.md                edit your idea if needed"
Write-Host "    LOOP_START_PROMPT.txt  copy-paste prompt"
Write-Host "    universal-agent.yaml   config (re-run setup-all after edits)"
Write-Host ""
Write-Host "  YOUR 3 STEPS:" -ForegroundColor Green
Write-Host "    1. Open the PARENT project in your AI editor"
Write-Host "    2. Load / attach AGENTS.md"
Write-Host "    3. Paste this prompt (also in LOOP_START_PROMPT.txt):"
Write-Host ""
Write-Host "  --------------------------------------------------------------------------" -ForegroundColor DarkGray
if (Test-Path "..\LOOP_START_PROMPT.txt") {
    Get-Content "..\LOOP_START_PROMPT.txt" | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "  Load AGENTS.md. Read PROJECT_MEMORY.md and idea.md. Implement phase by phase until done."
}
Write-Host "  --------------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Re-run setup-all after editing idea.md or universal-agent.yaml." -ForegroundColor Gray
Write-Host ""
if ($doctorExit -ne 0) {
    Write-Host "  [NOTE] doctor reported gaps — see tips above." -ForegroundColor Yellow
} else {
    Write-Host "  [OK] doctor score looks good." -ForegroundColor Green
}
Write-Host ""
Read-Host "  Press Enter to exit"
exit 0
