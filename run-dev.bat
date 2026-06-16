@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Install Node.js LTS and re-run.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing npm dependencies...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

rem No interactive Angular CLI prompts (analytics, port, etc.)
set "CI=true"
set "NG_CLI_ANALYTICS=ci"
call npx ng analytics enable >nul 2>nul

rem Free port 4200 if a previous dev server is still running
echo Checking port 4200...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4200 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>nul

echo.
echo Starting Angular dev server on http://127.0.0.1:4200/
echo Browser opens automatically after the first compile (~10-20 sec).
echo Keep this window open. Close it to stop the server.
echo.

call npm start -- --host 127.0.0.1 --port 4200 --open
if errorlevel 1 pause
