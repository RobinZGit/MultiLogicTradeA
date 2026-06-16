@echo off
setlocal EnableDelayedExpansion
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

if not exist "node_modules\.bin\ng.cmd" (
  echo ERROR: Angular CLI still missing after npm install.
  echo Run "npm install" in this folder and check for errors.
  pause
  exit /b 1
)

rem Stop static server that may lock files under dist\
echo Checking port 5173...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>nul

set "DIST_DIR="

echo Building production bundle...
call npx ng build
if errorlevel 1 (
  echo.
  echo Build failed ^(often EPERM if dist is locked by serve, Explorer, or antivirus^).
  echo Retrying to dist-build-check...
  call npx ng build --output-path=dist-build-check
  if errorlevel 1 (
    echo ERROR: production build failed.
    pause
    exit /b 1
  )
)

rem ng build --output-path=... writes directly to that folder (no extra project subfolder)
if exist "dist\multilogic-trade-a\index.html" (
  set "DIST_DIR=dist\multilogic-trade-a"
) else if exist "dist-build-check\index.html" (
  set "DIST_DIR=dist-build-check"
) else if exist "dist-build-check\multilogic-trade-a\index.html" (
  set "DIST_DIR=dist-build-check\multilogic-trade-a"
)

if not defined DIST_DIR (
  echo ERROR: build finished but index.html not found in dist or dist-build-check.
  pause
  exit /b 1
)

echo Using build folder: %DIST_DIR%

rem SPA fallback for deep links like /finresp (same as GitHub Pages CI)
copy /Y "%DIST_DIR%\index.html" "%DIST_DIR%\404.html" >nul

set "MLTA_URL=http://127.0.0.1:5173/finresp"
echo.
echo Starting static server on %MLTA_URL%
echo Serving folder: %DIST_DIR%
echo Waiting for port 5173, then opening browser...
echo.

start "MultiLogicTradeA-serve" /MIN cmd /c "npx --yes serve -s ""%DIST_DIR%"" -l 5173"

powershell -NoProfile -Command "$ok=$false; 1..90 | ForEach-Object { if ((Test-NetConnection 127.0.0.1 -Port 5173 -WarningAction SilentlyContinue).TcpTestSucceeded) { $ok=$true; break }; Start-Sleep 1 }; if (-not $ok) { exit 1 }"
if errorlevel 1 (
  echo ERROR: server did not start on port 5173 within 90 seconds.
  pause
  exit /b 1
)

start "" "%MLTA_URL%"
if errorlevel 1 (
  rundll32 url.dll,FileProtocolHandler "%MLTA_URL%"
)
echo Browser opened: %MLTA_URL%
echo Server runs in a minimized window titled "MultiLogicTradeA-serve".
echo Close that window to stop the server.
echo.
pause
