# Universal Loop Agent - Init
# Run this script from the Universal_Loop_Agent folder

Write-Host ""
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host "   Universal Loop Agent - Init" -ForegroundColor Cyan
Write-Host "  ====================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to script directory
Set-Location -Path $PSScriptRoot

# Check if bun is installed
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "  [ERROR] bun is not installed." -ForegroundColor Red
    Write-Host "  Install: powershell -c `"irm bun.sh/install.ps1|iex`"" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "  Press Enter to exit"
    exit 1
}

Write-Host "  Detecting project stack..." -ForegroundColor White
Write-Host ""

try {
    bun run src/cli.ts init ..
    Write-Host ""
    Write-Host "  [OK] Ready! Edit universal-agent.yaml if needed." -ForegroundColor Green
    Write-Host "  Then run: uagent generate" -ForegroundColor Cyan
} catch {
    Write-Host ""
    Write-Host "  [FAIL] Something went wrong: $_" -ForegroundColor Red
}

Write-Host ""
Read-Host "  Press Enter to exit"
