#requires -Version 5.1
<#
.SYNOPSIS
  MultiLogicTradeA — dev server (PowerShell, без cmd).

.DESCRIPTION
  Аналог run-dev.bat: npm start на 127.0.0.1:4200, tech-log на 4201, рассылка SMTP.
  Окна логов — PowerShell (Ctrl+V для вставки).

  Первый запуск при блокировке скриптов:
    Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
  или: powershell -ExecutionPolicy Bypass -File .\run-dev.ps1
#>
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Root = $PSScriptRoot
Set-Location -LiteralPath $Root

function Wait-Key {
  Write-Host ''
  Read-Host 'Нажмите Enter для выхода'
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory)][string]$FilePath,
    [string[]]$ArgumentList = @()
  )
  & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $FilePath $($ArgumentList -join ' ')"
  }
}

function Stop-ListenerOnPort {
  param([Parameter(Mandatory)][int]$Port)
  Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

function Wait-TcpPort {
  param(
    [string]$HostName = '127.0.0.1',
    [Parameter(Mandatory)][int]$Port,
    [int]$TimeoutSec = 120
  )
  1..$TimeoutSec | ForEach-Object {
    if ((Test-NetConnection $HostName -Port $Port -WarningAction SilentlyContinue).TcpTestSucceeded) {
      return $true
    }
    Start-Sleep -Seconds 1
  }
  return $false
}

function Start-ProjectShell {
  param(
    [Parameter(Mandatory)][string]$Title,
    [Parameter(Mandatory)][string]$Command,
    [ValidateSet('Normal', 'Minimized')]
    [string]$WindowStyle = 'Normal',
    [switch]$NoExit
  )
  $exe = if (Get-Command pwsh -ErrorAction SilentlyContinue) { 'pwsh' } else { 'powershell' }
  $rootEsc = $Root.Replace("'", "''")
  $cmdEsc = $Command.Replace("'", "''")
  $psCommand = "`$host.UI.RawUI.WindowTitle = '$Title'; Set-Location -LiteralPath '$rootEsc'; $cmdEsc"
  $argList = @('-NoProfile')
  if ($NoExit) { $argList += '-NoExit' }
  $argList += '-Command', $psCommand
  Start-Process -FilePath $exe -WindowStyle $WindowStyle -ArgumentList $argList | Out-Null
}

try {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js not found. Install Node.js LTS and re-run.'
    Wait-Key
    exit 1
  }

  if (-not (Test-Path -LiteralPath (Join-Path $Root 'node_modules\.bin\ng.cmd'))) {
    Write-Host 'Installing npm dependencies (Angular CLI not found in node_modules)...'
    Invoke-Checked -FilePath 'npm' -ArgumentList @('install')
  }

  Invoke-Checked -FilePath 'node' -ArgumentList @('scripts\ensure-npm-deps.mjs')

  if (-not (Test-Path -LiteralPath (Join-Path $Root 'node_modules\.bin\ng.cmd'))) {
    Write-Host 'ERROR: Angular CLI still missing after npm install.'
    Write-Host 'Run "npm install" in this folder and check for errors.'
    Wait-Key
    exit 1
  }

  $env:NG_CLI_ANALYTICS = 'ci'
  & npx ng analytics enable 2>$null | Out-Null

  Write-Host 'Checking port 4200...'
  Stop-ListenerOnPort -Port 4200

  Write-Host 'Checking port 4201...'
  Stop-ListenerOnPort -Port 4201

  Write-Host ''
  Write-Host 'Mail.ru SMTP (рассылка)...'
  Invoke-Checked -FilePath 'node' -ArgumentList @('scripts\ensure-notify-smtp.mjs')
  Write-Host ''

  $mltaUrl = 'http://127.0.0.1:4200/finresp'
  Write-Host ''
  Write-Host "Starting Angular dev server on $mltaUrl"
  Write-Host 'Waiting for first compile, then opening browser...'
  Write-Host 'Logs: window titled "MultiLogicTradeA-dev"'
  Write-Host 'Tech info file: logs\finresp-tech-log.txt (when tech-log server runs)'
  Write-Host 'Notify log: logs\finresp-notify.log (SMTP from notify.local.json)'
  Write-Host ''

  Start-ProjectShell -Title 'MultiLogicTradeA-techlog' -WindowStyle Minimized `
    -Command 'node scripts\finresp-tech-log-server.mjs'

  Start-ProjectShell -Title 'MultiLogicTradeA-dev' -NoExit `
    -Command 'npm start -- --host 127.0.0.1 --port 4200'

  if (-not (Wait-TcpPort -Port 4200 -TimeoutSec 120)) {
    Write-Host 'ERROR: dev server did not start on port 4200 within 120 seconds.'
    Write-Host 'Check the "MultiLogicTradeA-dev" window for compile errors.'
    Wait-Key
    exit 1
  }

  Start-Process $mltaUrl
  Write-Host "Browser opened: $mltaUrl"
  Write-Host 'Close "MultiLogicTradeA-dev" to stop the server.'
  Wait-Key
}
catch {
  Write-Host "ERROR: $($_.Exception.Message)"
  Wait-Key
  exit 1
}
