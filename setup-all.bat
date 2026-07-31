@echo off
echo.
echo  ====================================
echo   Universal Loop Agent - setup-all
echo  ====================================
echo  Single entry point for all users.
echo  Target project: parent folder (..)
echo.

cd /d "%~dp0"

where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo  [0a/6] Bun not found — installing via bun.sh...
    echo.
    powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://bun.sh/install.ps1 | iex"
    if %errorlevel% neq 0 (
        echo  [ERROR] Bun auto-install failed.
        echo  Manual: powershell -c "irm https://bun.sh/install.ps1 | iex"
        echo.
        pause
        exit /b 1
    )
    set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
    where bun >nul 2>&1
    if %errorlevel% neq 0 (
        echo  [ERROR] Bun installed but not on PATH in this session.
        echo  Close this window, open a new terminal, and re-run setup-all.bat
        echo.
        pause
        exit /b 1
    )
    echo  [OK] Bun is available.
    echo.
)

if not exist "node_modules" (
    echo  [0/6] Installing toolkit dependencies...
    call bun install
    if %errorlevel% neq 0 (
        echo  [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo.
)

echo  [1/6] Init — detect stack, YAML, PROJECT_MEMORY.md...
echo.
call bun run src/cli.ts init ..
if %errorlevel% neq 0 (
    echo  [FAIL] init failed.
    pause
    exit /b 1
)
echo.

echo  [2/6] Upgrade — migrate legacy names/refs...
echo.
call bun run src/cli.ts upgrade .. --dry-run
call bun run src/cli.ts upgrade .. --yes --prune
if %errorlevel% neq 0 (
    echo  [WARN] upgrade reported issues — continuing.
)
echo.

echo  [3/6] Idea — ensure idea.md template if missing...
echo.
call bun run src/cli.ts ensure-idea ..
echo.

set "IDEA="
if exist "..\idea.md" set "IDEA=../idea.md"
if exist "..\IDEA.md" set "IDEA=../IDEA.md"
if exist "..\plan.md" set "IDEA=../plan.md"
if exist "..\PLAN.md" set "IDEA=../PLAN.md"
if exist "..\idea.txt" set "IDEA=../idea.txt"

if defined IDEA (
    echo  [4/6] plan-from — phases from %IDEA%...
    echo.
    call bun run src/cli.ts plan-from %IDEA% ..
    if %errorlevel% neq 0 (
        echo  [WARN] plan-from failed — continuing.
    )
    echo.
) else (
    echo  [4/6] plan-from — skipped
    echo.
)

echo  [5/6] Generate — AGENTS.md + adapters + start prompt...
echo.
if not exist "..\universal-agent.yaml" (
    echo  [FAIL] universal-agent.yaml missing in parent after init.
    pause
    exit /b 1
)
call bun run src/cli.ts generate ../universal-agent.yaml -o .. --force --adapters
if %errorlevel% neq 0 (
    echo  [FAIL] generate failed.
    pause
    exit /b 1
)
call bun run src/cli.ts write-prompt ..
echo.

echo  [6/6] Doctor — readiness check...
echo.
call bun run src/cli.ts doctor ..
set DOCTOR_EXIT=%errorlevel%
echo.

echo  ====================================
echo   Done — 3 steps left for you
echo  ====================================
echo.
echo  Product files ^(PARENT folder^):
echo    AGENTS.md              load this in the AI chat
echo    PROJECT_MEMORY.md      portable memory / phases
echo    idea.md                edit your idea if needed
echo    LOOP_START_PROMPT.txt  copy-paste prompt
echo    universal-agent.yaml   config ^(re-run setup-all after edits^)
echo.
echo  YOUR 3 STEPS:
echo    1. Open the PARENT project in your AI editor
echo    2. Load / attach AGENTS.md
echo    3. Paste this prompt ^(also in LOOP_START_PROMPT.txt^):
echo.
echo  --------------------------------------------------------------------------
type ..\LOOP_START_PROMPT.txt 2>nul
if errorlevel 1 (
  echo  Load AGENTS.md. Read PROJECT_MEMORY.md and idea.md. Implement phase by phase until done. Do not ask to continue between phases.
)
echo  --------------------------------------------------------------------------
echo.
echo  Re-run setup-all.bat after editing idea.md or universal-agent.yaml.
echo.
if %DOCTOR_EXIT% neq 0 (
    echo  [NOTE] doctor reported gaps — see tips above.
) else (
    echo  [OK] doctor score looks good.
)
echo.
pause
exit /b 0
