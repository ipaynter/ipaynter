@echo off
rem ==========================================================================
rem  MAD WORLD STUDIOS - start button for the Ivan is Ivan Live Mixer
rem  Each click:
rem   1. Checks GitHub (ipaynter/ipaynter) for a newer mixer and installs it.
rem      No internet? It uses the newest mixer zip in Downloads, if newer.
rem   2. Keeps your songs (data folder) and Stream Deck key.
rem   3. Keeps the "Mad World Studios" button on your desktop.
rem   4. Starts the mixer in Chrome.
rem  The PowerShell part is at the end of this file. It is plain text you can read.
rem ==========================================================================
title Mad World Studios
set "MWS_SELF=%~f0"
rem One block: Windows reads it all before running it, so an update that
rem rewrites this file while it runs can't confuse it.
(
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=[IO.File]::ReadAllText($env:MWS_SELF); $i=$t.IndexOf('#MWS'+'-PS#'); Invoke-Expression $t.Substring($i)"
  if errorlevel 1 pause
  exit /b
)
#MWS-PS#
$ErrorActionPreference = 'Stop'
$Repo   = 'ipaynter/ipaynter'
$Branch = 'claude/podcast-dj-mixer-app-yruycr'
$Sub    = 'ivan-is-ivan-mixer'
$App    = Join-Path $env:USERPROFILE 'IvanIsIvanMixer'
$Dl     = Join-Path $env:USERPROFILE 'Downloads'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}

function Ver([string]$s) { try { [version]($s.Trim()) } catch { [version]'0.0.0' } }
function Installed { if (Test-Path (Join-Path $App 'VERSION')) { Ver (Get-Content (Join-Path $App 'VERSION') -Raw) } else { [version]'0.0.0' } }
function Log([string]$m) { try { Add-Content -Path (Join-Path $App 'start-log.txt') -Value ("{0:yyyy-MM-dd HH:mm:ss}  [button] {1}" -f (Get-Date), $m) } catch {} }

# Unpack a zip and copy the mixer folder inside it over the installed one.
function Install-Zip([string]$zip, [string]$from) {
    $tmp = Join-Path $env:TEMP ('mws-' + [guid]::NewGuid().ToString('N'))
    try {
        Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force
        $src = Get-ChildItem -Path $tmp -Recurse -Filter 'app.js' | Where-Object { $_.Directory.Name -eq $Sub } | Select-Object -First 1
        if (-not $src) { throw 'no mixer inside the download' }
        $src = $src.Directory.FullName
        $new = Ver (Get-Content (Join-Path $src 'VERSION') -Raw)
        if (-not (Test-Path $App)) { New-Item -ItemType Directory -Path $App | Out-Null }
        # data\ and control-key.txt are never in the download, so they stay as they are
        Copy-Item -Path (Join-Path $src '*') -Destination $App -Recurse -Force
        try { Get-ChildItem -Path $App -Recurse -File | Unblock-File } catch {}   # clear Windows' downloaded-file mark
        Write-Host "  Updated to v$new ($from)." -ForegroundColor Green
        Log "Installed v$new from $from"
    } finally { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}

Write-Host ''
Write-Host '  MAD WORLD STUDIOS' -ForegroundColor Red
Write-Host '  Ivan is Ivan - Live Mixer'
Write-Host '  ========================='
$have = Installed
if ($have -gt [version]'0.0.0') { Write-Host "  Installed: v$have" } else { Write-Host '  Not installed yet.' }

# 1) GitHub
$latest = $null
try {
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 -Uri "https://raw.githubusercontent.com/$Repo/$Branch/$Sub/VERSION"
    $c = $r.Content; if ($c -is [byte[]]) { $c = [Text.Encoding]::UTF8.GetString($c) }
    $latest = Ver $c
    Write-Host "  Latest:    v$latest"
} catch { Write-Host '  Could not reach GitHub (offline?). Checking Downloads instead.' -ForegroundColor Yellow }
if ($latest -and $latest -gt $have) {
    Write-Host "  Downloading v$latest ..."
    $zip = Join-Path $env:TEMP ('mws-' + [guid]::NewGuid().ToString('N') + '.zip')
    try {
        Invoke-WebRequest -UseBasicParsing -TimeoutSec 120 -Uri "https://codeload.github.com/$Repo/zip/refs/heads/$Branch" -OutFile $zip
        Install-Zip $zip 'GitHub'
    } catch {
        Write-Host "  Update failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Log "GitHub update failed: $($_.Exception.Message)"
    } finally { Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue }
}

# 2) Downloads (no internet, or a zip you were sent)
$z = Get-ChildItem -Path $Dl -Filter 'ivan-is-ivan-mixer*.zip' -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($z) {
    $m = [regex]::Match($z.Name, 'v(\d+\.\d+\.\d+)')
    $zv = if ($m.Success) { Ver $m.Groups[1].Value } else { [version]'0.0.0' }
    if ($zv -gt (Installed)) {
        try { Install-Zip $z.FullName $z.Name } catch { Write-Host "  Could not install $($z.Name): $($_.Exception.Message)" -ForegroundColor Yellow }
    }
}

if (-not (Test-Path (Join-Path $App 'start-windows.bat'))) {
    Write-Host ''
    Write-Host '  The mixer is not installed yet, and no download was possible.' -ForegroundColor Red
    Write-Host '  Connect to the internet and click again, or put ivan-is-ivan-mixer-vX.Y.Z.zip in Downloads.'
    Read-Host '  Press Enter to close'
    exit 1
}

# 3) The desktop button (refreshed every time, so it always has the right icon and target)
try {
    $self = Join-Path $App 'Mad World Studios.bat'
    if (-not (Test-Path $self)) { Copy-Item -LiteralPath $env:MWS_SELF -Destination $self -Force }
    $desk = [Environment]::GetFolderPath('Desktop')
    $ws = New-Object -ComObject WScript.Shell
    $lnk = $ws.CreateShortcut((Join-Path $desk 'Mad World Studios.lnk'))
    $lnk.TargetPath = $self
    $lnk.WorkingDirectory = $App
    $ico = Join-Path $App 'mad-world-studios.ico'
    if (Test-Path $ico) { $lnk.IconLocation = "$ico,0" }
    $lnk.Description = 'Mad World Studios - updates and starts the Ivan is Ivan Live Mixer'
    $lnk.Save()
    $old = Join-Path $desk 'Ivan is Ivan Mixer.lnk'   # the older button, replaced by this one
    if (Test-Path $old) { Remove-Item -LiteralPath $old -Force; Write-Host '  Replaced the old "Ivan is Ivan Mixer" button.' }
} catch { Log "Desktop button: $($_.Exception.Message)" }

# 4) Start
Write-Host "  Starting v$(Installed) ..."
Write-Host ''
Set-Location $App
& (Join-Path $App 'start-windows.bat')
