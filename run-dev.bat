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

echo Starting Angular dev server...
set "MLTA_URL=http://127.0.0.1:4200/"
echo Opening %MLTA_URL%
start "" "%MLTA_URL%"
call npm start -- --host 127.0.0.1 --port 4200
