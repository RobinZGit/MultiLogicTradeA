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

echo Building production bundle...
call npm run build
if errorlevel 1 (
  pause
  exit /b 1
)

set "MLTA_URL=http://127.0.0.1:5173/finresp"
echo.
echo Starting static server on %MLTA_URL%
echo Waiting for port 5173, then opening browser...
echo.

start "MultiLogicTradeA-serve" /MIN cmd /c "npx --yes serve -s dist -l 5173"

powershell -NoProfile -Command "$ok=$false; 1..90 | ForEach-Object { if ((Test-NetConnection 127.0.0.1 -Port 5173 -WarningAction SilentlyContinue).TcpTestSucceeded) { $ok=$true; break }; Start-Sleep 1 }; if (-not $ok) { exit 1 }"
if errorlevel 1 (
  echo ERROR: server did not start on port 5173 within 90 seconds.
  pause
  exit /b 1
)

start "" "%MLTA_URL%"
echo Browser opened: %MLTA_URL%
echo Server runs in a minimized window titled "MultiLogicTradeA-serve".
echo Close that window to stop the server.
echo.
pause
