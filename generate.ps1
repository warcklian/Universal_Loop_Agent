# Universal Loop Agent - Generate
# Run this script from the Universal_Loop_Agent folder

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   Universal Loop Agent - Generate" -ForegroundColor Cyan
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path $PSScriptRoot

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "  [ERROR] bun is not installed." -ForegroundColor Red
    Write-Host "  Install: powershell -c `"irm bun.sh/install.ps1|iex`"" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "  Press Enter to exit"
    exit 1
}

if (-not (Test-Path "..\universal-agent.yaml")) {
    Write-Host "  [ERROR] universal-agent.yaml not found in parent directory." -ForegroundColor Red
    Write-Host "  Run init.ps1 first." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "  Press Enter to exit"
    exit 1
}

Write-Host "  Generating AGENTS.md..." -ForegroundColor White
Write-Host ""

try {
    bun run src/cli.ts generate ../universal-agent.yaml
    Write-Host ""
    Write-Host "  [OK] AGENTS.md generated successfully." -ForegroundColor Green
    Write-Host "  Load it in your AI editor to activate loop mode." -ForegroundColor Cyan
} catch {
    Write-Host ""
    Write-Host "  [FAIL] Something went wrong: $_" -ForegroundColor Red
}

Write-Host ""
Read-Host "  Press Enter to exit"
