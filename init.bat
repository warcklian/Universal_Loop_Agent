@echo off
echo.
echo  ====================================
echo   Universal Loop Agent - Init
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

echo  Detecting project stack...
echo.
call bun run src/cli.ts init ..

echo.
if %errorlevel% equ 0 (
    echo  [OK] Ready! Edit universal-agent.yaml if needed.
    echo  Then run: uagent generate
) else (
    echo  [FAIL] Something went wrong.
)

echo.
pause
