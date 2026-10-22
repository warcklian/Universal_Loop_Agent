@echo off
REM UTF-8 console so dashes/arrows do not show as mojibake (OCo, etc.)
chcp 65001 >nul
setlocal EnableExtensions

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
    echo  [0a/6] Bun not found - installing via bun.sh...
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

echo  [0b/8] Update - checking for a newer toolkit version...
echo.
call bun run src/cli.ts update .
echo.

if not exist "node_modules" (
    echo  [0/8] Installing toolkit dependencies...
    call bun install
    if %errorlevel% neq 0 (
        echo  [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo.
)

echo  [1/8] Verify - docs/scripts vs CLI surface...
echo.
call bun run src/cli.ts verify .
if %errorlevel% neq 0 (
    echo  [FAIL] verify reported surface gaps - aborting setup.
    pause
    exit /b 1
)
echo.

echo  [2/8] Init - detect stack, YAML, PROJECT_MEMORY.md...
echo.
call bun run src/cli.ts init ..
if %errorlevel% neq 0 (
    echo  [FAIL] init failed.
    pause
    exit /b 1
)
echo.

echo  [3/8] Upgrade - migrate legacy names/refs (no prune / no AGENTS rewrite)...
echo.
call bun run src/cli.ts upgrade .. --dry-run --skip-agents-regen
call bun run src/cli.ts upgrade .. --yes --skip-agents-regen
if %errorlevel% neq 0 (
    echo  [WARN] upgrade reported issues - continuing.
)
echo.

echo  [4/8] Idea - ensure idea.md template if missing...
echo.
call bun run src/cli.ts ensure-idea ..
echo.

rem Paths relative to parent (..). Prefer known names; then any *plan* / *idea* .md/.txt
set "IDEA="
if not defined IDEA if exist "..\idea.md" set "IDEA=idea.md"
if not defined IDEA if exist "..\plan.md" set "IDEA=plan.md"
if not defined IDEA if exist "..\PLAN.md" set "IDEA=PLAN.md"
if not defined IDEA if exist "..\idea.txt" set "IDEA=idea.txt"
if not defined IDEA for %%F in ("..\*Plan*.md" "..\*plan*.md" "..\*idea*.md" "..\*idea*.txt") do if exist %%~F if not defined IDEA set "IDEA=%%~nxF"

if defined IDEA (
    echo  [5/8] plan-from - phases from %IDEA%...
    echo.
    call bun run src/cli.ts plan-from %IDEA% ..
    if %errorlevel% neq 0 (
        echo  [WARN] plan-from failed - continuing.
    )
    echo.
) else (
    echo  [5/8] plan-from - skipped
    echo.
)

echo  [6/8] Generate - AGENTS.md + adapters (load AGENTS.md activates loop)...
echo.
if not exist "..\universal-agent.yaml" (
    echo  [FAIL] universal-agent.yaml missing in parent after init.
    pause
    exit /b 1
)
rem AGENTS.md from YAML. Adapters: create missing only. Drops obsolete LOOP_START_PROMPT.txt.
call bun run src/cli.ts generate ../universal-agent.yaml -o .. --adapters
if %errorlevel% neq 0 (
    echo  [FAIL] generate failed.
    pause
    exit /b 1
)
echo.

echo  [7/8] Reconcile - AGENTS contract brief (WARN continues)...
echo.
call bun run src/cli.ts reconcile ..
if %errorlevel% neq 0 (
    echo  [WARN] reconcile reported issues - continuing.
)
echo.

echo  [8/8] Doctor - readiness check...
echo.
call bun run src/cli.ts doctor ..
set DOCTOR_EXIT=%errorlevel%
echo.

echo  ====================================
echo   Done - 3 steps left for you
echo  ====================================
echo.
echo  Product files ^(PARENT folder^):
echo    AGENTS.md              load this — loop activates ^(no paste^)
echo    PROJECT_MEMORY.md      portable memory / phases
echo    CHANGE_CONTROL.md     change register ^(row before code, docs before implementing^)
echo    idea.md                edit your idea if needed
echo    universal-agent.yaml   config ^(re-run setup-all after edits^)
echo.
echo  YOUR 3 STEPS:
echo    1. Open the PARENT project in your AI editor
echo    2. Load / attach AGENTS.md (the loop activates automatically — no prompt to paste)
echo    3. Start implementing phase by phase
echo.
echo  --------------------------------------------------------------------------
echo  POLICY (docs/file-lifecycle.md): create if missing / update features / rename legacy — NEVER delete.
echo  Memory, CHANGE_CONTROL, idea, YAML, stamps: never wiped. Existing ## Phases checklist kept (no --force).
echo  Adapters: create-if-missing. LOOP_START_PROMPT.txt is obsolete and removed on generate.
echo  AGENTS.md updates from YAML when content differs. upgrade: no --prune.
echo  --------------------------------------------------------------------------
echo.
echo  Re-run setup-all.bat after editing idea.md or universal-agent.yaml.
echo.
if %DOCTOR_EXIT% neq 0 (
    echo  [NOTE] doctor reported gaps - see tips above.
) else (
    echo  [OK] doctor score looks good.
)
echo.
pause
exit /b 0
