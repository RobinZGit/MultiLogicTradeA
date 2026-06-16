@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Install Node.js LTS and re-run.
  pause
  exit /b 1
)

if not exist "node_modules\.bin\ng.cmd" (
  echo Installing npm dependencies ^(Angular CLI not found in node_modules^)...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

node scripts\ensure-npm-deps.mjs
if errorlevel 1 (
  pause
  exit /b 1
)

if not exist "node_modules\.bin\ng.cmd" (
  echo ERROR: Angular CLI still missing after npm install.
  echo Run "npm install" in this folder and check for errors.
  pause
  exit /b 1
)

rem Analytics only — do NOT set CI=true (Angular CLI skips --open when CI is set)
set "NG_CLI_ANALYTICS=ci"
call npx ng analytics enable >nul 2>nul

rem Free port 4200 if a previous dev server is still running
echo Checking port 4200...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4200 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>nul

set "MLTA_URL=http://127.0.0.1:4200/finresp"
echo.
echo Starting Angular dev server on %MLTA_URL%
echo Waiting for first compile, then opening browser...
echo Logs: window titled "MultiLogicTradeA-dev"
echo.

start "MultiLogicTradeA-dev" cmd /k "cd /d ""%~dp0"" && npm start -- --host 127.0.0.1 --port 4200"

powershell -NoProfile -Command "$ok=$false; 1..120 | ForEach-Object { if ((Test-NetConnection 127.0.0.1 -Port 4200 -WarningAction SilentlyContinue).TcpTestSucceeded) { $ok=$true; break }; Start-Sleep 1 }; if (-not $ok) { exit 1 }"
if errorlevel 1 (
  echo ERROR: dev server did not start on port 4200 within 120 seconds.
  echo Check the "MultiLogicTradeA-dev" window for compile errors.
  pause
  exit /b 1
)

start "" "%MLTA_URL%"
if errorlevel 1 (
  rundll32 url.dll,FileProtocolHandler "%MLTA_URL%"
)
echo Browser opened: %MLTA_URL%
echo Close "MultiLogicTradeA-dev" to stop the server.
echo.
pause
