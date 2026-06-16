@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Install Node.js LTS and re-run.
  exit /b 1
)

if not exist "node_modules" (
  echo Installing npm dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)

echo Building production bundle...
call npm run build
if errorlevel 1 exit /b 1

echo Serving dist on http://localhost:5173 ...
call npx --yes serve -s dist
