@echo off
echo.
echo  ====================================
echo   Universal Loop Agent - Generate
echo  ====================================
echo.

cd /d "%~dp0"

where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] bun is not installed.
    echo  Install: powershell -c "irm bun.sh/install.ps1"^|iex
    echo.
    pause
    exit /b 1
)

if not exist "..\universal-agent.yaml" (
    echo  [ERROR] universal-agent.yaml not found in parent directory.
    echo  Run init.bat first.
    echo.
    pause
    exit /b 1
)

echo  Generating AGENTS.md...
echo.
call bun run src/cli.ts generate ../universal-agent.yaml

echo.
if %errorlevel% equ 0 (
    echo  [OK] AGENTS.md generated successfully.
    echo  Load it in your AI editor to activate loop mode.
) else (
    echo  [FAIL] Something went wrong.
)

echo.
pause
