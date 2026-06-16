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

set "DIST_DIR=dist\multilogic-trade-a"
if not exist "%DIST_DIR%\index.html" (
  echo ERROR: build output missing: %DIST_DIR%\index.html
  pause
  exit /b 1
)

rem SPA fallback for deep links like /finresp (same as GitHub Pages CI)
copy /Y "%DIST_DIR%\index.html" "%DIST_DIR%\404.html" >nul

rem Free port 5173 if a previous serve is still running
echo Checking port 5173...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>nul

set "MLTA_URL=http://127.0.0.1:5173/finresp"
echo.
echo Starting static server on %MLTA_URL%
echo Serving folder: %DIST_DIR%
echo Waiting for port 5173, then opening browser...
echo.

start "MultiLogicTradeA-serve" /MIN cmd /c "npx --yes serve -s %DIST_DIR% -l 5173"

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
