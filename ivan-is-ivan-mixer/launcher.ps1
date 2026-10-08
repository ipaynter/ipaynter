# Mad World Studios - start button for Late Night with Ivan (DJ Board).
# Run by "Mad World Studios.bat". Each run:
#   1. Finds the newest version: this folder (an unzipped download) or a zip in Downloads.
#   2. If it is newer than the installed one: backs up your data, installs it,
#      and moves the old version to the Recycle Bin.
#   3. Moves older copies (old zips, old folders, old buttons) to the Recycle Bin.
#   4. Keeps the "Mad World Studios" button on the desktop.
#   5. Starts the DJ board.
# It never connects to the internet, and never deletes anything outright:
# old things go to the Recycle Bin, so you can always get them back.

$ErrorActionPreference = 'Stop'
$Root = Join-Path $env:USERPROFILE 'LateNightWithIvan'
$App  = Join-Path $Root 'app'
$Data = Join-Path $Root 'data'
$Dl   = Join-Path $env:USERPROFILE 'Downloads'
$Log  = Join-Path $Root 'install-log.txt'
$Here = $PSScriptRoot
$AppFiles = @('app.js', 'index.html', 'serve.ps1')   # what makes a folder "the DJ board" (very old ones have no VERSION file)

if (-not (Test-Path $Root)) { New-Item -ItemType Directory -Path $Root | Out-Null }
if (-not (Test-Path $Data)) { New-Item -ItemType Directory -Path $Data | Out-Null }
function Log([string]$m) { try { Add-Content -LiteralPath $Log -Value ('{0:yyyy-MM-dd HH:mm:ss}  {1}' -f (Get-Date), $m) } catch {} }
function Say([string]$m, [string]$c = 'Gray') { Write-Host "  $m" -ForegroundColor $c }
function Ver([string]$s) { try { [version]($s.Trim()) } catch { [version]'0.0.0' } }
function VerOf([string]$dir) { $f = Join-Path $dir 'VERSION'; if (Test-Path -LiteralPath $f) { Ver (Get-Content -LiteralPath $f -Raw) } else { [version]'0.0.0' } }
function IsBoard([string]$dir) { foreach ($f in $AppFiles) { if (-not (Test-Path -LiteralPath (Join-Path $dir $f))) { return $false } }; $true }
function Same([string]$a, [string]$b) { [IO.Path]::GetFullPath($a).TrimEnd('\', '/') -eq [IO.Path]::GetFullPath($b).TrimEnd('\', '/') }

# Recycle Bin, never a hard delete. (LNWI_TEST_TRASH: a plain folder instead, for testing off Windows.)
$script:recycled = 0
function Recycle([string]$path, [string]$why) {
    if (-not $path -or -not (Test-Path -LiteralPath $path)) { return }
    try {
        if ($env:LNWI_TEST_TRASH) {
            if (-not (Test-Path $env:LNWI_TEST_TRASH)) { New-Item -ItemType Directory -Path $env:LNWI_TEST_TRASH | Out-Null }
            Move-Item -LiteralPath $path -Destination (Join-Path $env:LNWI_TEST_TRASH ([guid]::NewGuid().ToString('N').Substring(0, 6) + '-' + (Split-Path $path -Leaf)))
        } else {
            Add-Type -AssemblyName Microsoft.VisualBasic
            if (Test-Path -LiteralPath $path -PathType Container) { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($path, 'OnlyErrorDialogs', 'SendToRecycleBin') }
            else { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($path, 'OnlyErrorDialogs', 'SendToRecycleBin') }
        }
        $script:recycled++
        Log "Recycle Bin: $path ($why)"
    } catch { Log "Could not move to the Recycle Bin: $path - $($_.Exception.Message)" }
}

# A DJ board that is still running keeps its folder in use: close it before changing anything.
function Stop-OldBoard {
    $procs = @()
    try {
        $procs = @(Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object {
            $_.ProcessId -ne $PID -and $_.CommandLine -match '(LateNightWithIvan|IvanIsIvanMixer|ivan-is-ivan-mixer|late-night-with-ivan).*(serve\.ps1|serve\.py|start-windows\.bat)' })
    } catch { return }
    if (-not $procs.Count) { return }
    Say 'Closing the DJ board that is still running, to update it ...' 'Yellow'
    foreach ($p in $procs) { try { Stop-Process -Id $p.ProcessId -Force; Log "Stopped running board (process $($p.ProcessId))" } catch {} }
    Start-Sleep -Seconds 2
}
# Songs found in an old copy: kept as a dated file in data\versions, and used if there are none yet.
function Save-OldData([string]$board, [string]$label) {
    $f = Join-Path $board 'data\mixer-data.json'
    if (-not (Test-Path -LiteralPath $f)) { return }
    $bk = Join-Path $Data 'versions'
    if (-not (Test-Path $bk)) { New-Item -ItemType Directory -Path $bk | Out-Null }
    Copy-Item -LiteralPath $f -Destination (Join-Path $bk ("songs-from-$label-{0:yyyy-MM-dd-HHmm}.json" -f (Get-Date))) -Force
    if (-not (Test-Path (Join-Path $Data 'mixer-data.json'))) {
        Copy-Item -Path (Join-Path $board 'data\*') -Destination $Data -Recurse -Force
        Say "Brought over your songs from $label." 'Green'
    }
    $k = Join-Path $board 'control-key.txt'
    if ((Test-Path -LiteralPath $k) -and -not (Test-Path (Join-Path $Data 'control-key.txt'))) { Copy-Item -LiteralPath $k -Destination (Join-Path $Data 'control-key.txt') }
    Log "Saved songs from $board"
}

Write-Host ''
Say 'MAD WORLD STUDIOS' 'Red'
Say 'Late Night with Ivan - DJ Board'
Say '==============================='
$have = VerOf $App
if ($have -gt [version]'0.0.0') { Say "Installed: v$have" } else { Say 'Not installed yet.' }

# ---- 1. Bring over your songs and Stream Deck key from the old "IvanIsIvanMixer" install (once) ----
$old = Join-Path $env:USERPROFILE 'IvanIsIvanMixer'
if (Test-Path -LiteralPath $old) { Save-OldData $old 'the old install' }

# ---- 2. The newest version available: this unzipped folder, or a zip in Downloads ----
$best = $null; $bestVer = $have
if ((IsBoard $Here) -and -not (Same $Here $App)) {
    $v = VerOf $Here
    if ($v -gt $bestVer) { $best = @{ kind = 'dir'; path = $Here; name = 'this folder' }; $bestVer = $v }
}
$zips = @(Get-ChildItem -Path $Dl -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^(late-night-with-ivan|ivan-is-ivan-mixer).*?v(\d+\.\d+\.\d+).*\.zip$' } |
    ForEach-Object { [pscustomobject]@{ file = $_; ver = (Ver $Matches[2]) } })
$top = $zips | Sort-Object ver -Descending | Select-Object -First 1
if ($top -and $top.ver -gt $bestVer) { $best = @{ kind = 'zip'; path = $top.file.FullName; name = $top.file.Name }; $bestVer = $top.ver }

# ---- 3. Install it ----
if ($best -or (Test-Path -LiteralPath $old)) { Stop-OldBoard }
if ($best) {
    Say "Installing v$bestVer from $($best.name) ..." 'Cyan'
    $tmp = Join-Path $Root ('incoming-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
    try {
        $src = $best.path
        if ($best.kind -eq 'zip') {
            Expand-Archive -LiteralPath $best.path -DestinationPath (Join-Path $tmp 'zip') -Force
            $src = Get-ChildItem -Path (Join-Path $tmp 'zip') -Recurse -Filter 'app.js' | ForEach-Object { $_.Directory.FullName } | Where-Object { IsBoard $_ } | Select-Object -First 1
            if (-not $src) { throw "no DJ board inside $($best.name)" }
        }
        $stage = Join-Path $tmp 'app'
        Copy-Item -LiteralPath $src -Destination $stage -Recurse -Force
        foreach ($x in @('data', 'control-key.txt', 'start-log.txt')) { Remove-Item -LiteralPath (Join-Path $stage $x) -Recurse -Force -ErrorAction SilentlyContinue }
        if (-not (IsBoard $stage) -or (VerOf $stage) -ne $bestVer) { throw 'the new version did not copy completely' }
        # your data, saved per version before anything changes
        $dataFile = Join-Path $Data 'mixer-data.json'
        if (Test-Path $dataFile) {
            $bk = Join-Path $Data 'versions'
            if (-not (Test-Path $bk)) { New-Item -ItemType Directory -Path $bk | Out-Null }
            Copy-Item -LiteralPath $dataFile -Destination (Join-Path $bk ("songs-before-v$bestVer-{0:yyyy-MM-dd-HHmm}.json" -f (Get-Date)))
            Log "Backed up data before v$bestVer"
        }
        # the old version goes to the Recycle Bin, the new one takes its place
        if (Test-Path $App) {
            Recycle $App "replaced by v$bestVer"
            if (Test-Path $App) { Rename-Item -LiteralPath $App -NewName ("app-old-v$have-" + (Get-Date -Format 'HHmmss')) }
        }
        Move-Item -LiteralPath $stage -Destination $App
        try { Get-ChildItem -LiteralPath $App -Recurse -File | Unblock-File } catch {}   # clear the "downloaded" mark
        Say "Installed v$bestVer." 'Green'; Log "Installed v$bestVer from $($best.path)"
    } catch {
        Say "Could not install: $($_.Exception.Message)" 'Yellow'; Log "Install failed: $($_.Exception.Message)"
    } finally { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}
$now = VerOf $App
if (-not (IsBoard $App)) {
    Write-Host ''
    Say 'The DJ board is not installed yet.' 'Red'
    Say 'Unzip late-night-with-ivan-vX.Y.Z.zip and double-click "Mad World Studios" inside it.'
    Read-Host '  Press Enter to close'
    exit 1
}

# ---- 4. The start button lives next to the app, and on the desktop ----
foreach ($f in @('Mad World Studios.bat', 'launcher.ps1', 'mad-world-studios.ico')) {
    $from = Join-Path $App $f; $to = Join-Path $Root $f
    if ((Test-Path -LiteralPath $from) -and -not (Same $from $to)) {
        try { Copy-Item -LiteralPath $from -Destination $to -Force } catch { Log "Could not copy $f - $($_.Exception.Message)" }
    }
}
$desk = [Environment]::GetFolderPath('Desktop')
try {
    $ws = New-Object -ComObject WScript.Shell
    $lnk = $ws.CreateShortcut((Join-Path $desk 'Mad World Studios.lnk'))
    $lnk.TargetPath = Join-Path $Root 'Mad World Studios.bat'
    $lnk.WorkingDirectory = $Root
    $lnk.IconLocation = (Join-Path $Root 'mad-world-studios.ico') + ',0'
    $lnk.Description = 'Mad World Studios - Late Night with Ivan DJ Board (updates itself from Downloads)'
    $lnk.Save()
} catch { Log "Desktop button: $($_.Exception.Message)" }

# ---- 5. Old versions and old buttons to the Recycle Bin ----
if ($desk) { Recycle (Join-Path $desk 'Ivan is Ivan Mixer.lnk') 'old desktop button' }
if (Test-Path -LiteralPath $old) { Recycle $old 'old install (songs saved first)' }
foreach ($z in $zips) { if ($z.ver -lt $now) { Recycle $z.file.FullName "older than v$now" } }
foreach ($place in @($Dl, $desk, [Environment]::GetFolderPath('MyDocuments'))) {
    if (-not $place -or -not (Test-Path -LiteralPath $place)) { continue }
    # unzipped copies of older versions (a folder, or a folder inside a folder, as Windows' Extract All makes)
    Get-ChildItem -LiteralPath $place -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^(late-night-with-ivan|ivan-is-ivan-mixer)' } | ForEach-Object {
        $folder = $_.FullName
        $board = if (IsBoard $folder) { $folder } else { Get-ChildItem -LiteralPath $folder -Directory | ForEach-Object { $_.FullName } | Where-Object { IsBoard $_ } | Select-Object -First 1 }
        if ($board -and ((VerOf $board) -lt $now) -and -not (Same $folder $Here) -and -not (Same $board $Here)) {
            Save-OldData $board (Split-Path $folder -Leaf)
            Recycle $folder "older copy (v$(VerOf $board))"
        }
    }
    # loose start buttons from earlier versions
    foreach ($b in @('Ivan Mixer.bat', 'Mad World Studios.bat')) {
        $p = Join-Path $place $b
        if ((Test-Path -LiteralPath $p) -and -not (Same $p (Join-Path $Here $b))) { Recycle $p 'old start button' }
    }
}
if ($script:recycled) { Say "Moved $($script:recycled) old item(s) to the Recycle Bin." }

# ---- 6. Start ----
Say "Starting v$now ..." 'Cyan'
Write-Host ''
$env:LNWI_DATA = $Data
if ($env:LNWI_TEST_NOSTART) { Say "(test) would start $App"; exit 0 }
Set-Location -LiteralPath $App
& (Join-Path $App 'start-windows.bat')
