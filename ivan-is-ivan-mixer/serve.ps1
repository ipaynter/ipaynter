# Ivan is Ivan - Live Mixer local server (Windows, no install needed).
# Serves the mixer on http://localhost:8765 (this computer only) and:
#   /api/cmd/<name>?k=<key>  Stream Deck "Website" action (GET in background)
#   /api/poll                mixer page picks up pending commands
#   /api/info                mixer page reads the control key
#   /api/save  (POST)        mixer saves its data to data\mixer-data.json (+ daily copy)
#   /api/load                mixer restores from the disk copy
#   /api/resolve?h=<handle>  look up a YouTube channel ID from an @handle
#   /api/feed?c=<channelId>  a creator's latest uploads (YouTube's public RSS feed)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$port = 8765
$root = [IO.Path]::GetFullPath($PSScriptRoot)
$sep = [IO.Path]::DirectorySeparatorChar
if (-not $root.EndsWith($sep)) { $root += $sep }
$dataDir = Join-Path $root 'data'
$dataFile = Join-Path $dataDir 'mixer-data.json'
$maxBody = 20MB
$keepDaily = 30

$keyFile = Join-Path $root 'control-key.txt'
if (Test-Path $keyFile) {
    $key = (Get-Content $keyFile -Raw).Trim()
} else {
    $bytes = New-Object byte[] 8
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $key = -join ($bytes | ForEach-Object { $_.ToString('x2') })
    Set-Content -Path $keyFile -Value $key -NoNewline
}

$mime = @{
    '.html' = 'text/html; charset=utf-8'; '.js' = 'application/javascript; charset=utf-8'
    '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json'; '.svg' = 'image/svg+xml'
    '.png' = 'image/png'; '.ico' = 'image/x-icon'; '.md' = 'text/plain; charset=utf-8'
}
$allowedHosts = @("localhost:$port", "127.0.0.1:$port")
$blockedExt = @('.ps1', '.py', '.bat', '.sh', '.txt')
$pending = New-Object System.Collections.Generic.List[string]
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Send-Bytes($res, [byte[]]$body, $type, $status = 200) {
    $res.StatusCode = $status
    $res.ContentType = $type
    $res.Headers.Add('Cache-Control', 'no-store')
    $res.ContentLength64 = $body.Length
    $res.OutputStream.Write($body, 0, $body.Length)
    $res.Close()
}
function Send-Json($res, $json, $status = 200) {
    Send-Bytes $res ($utf8.GetBytes($json)) 'application/json' $status
}

# Fetch a youtube.com page. Only called with URLs built from validated IDs.
function Get-YouTube([string]$url) {
    $wc = New-Object System.Net.WebClient
    $wc.Encoding = [Text.Encoding]::UTF8
    $wc.Headers.Add('User-Agent', 'Mozilla/5.0 (IvanIsIvanMixer)')
    $wc.Headers.Add('Accept-Language', 'en')
    $wc.Headers.Add('Cookie', 'CONSENT=YES+1; SOCS=CAI')
    try { return $wc.DownloadString($url) } finally { $wc.Dispose() }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try { $listener.Start() } catch {
    Write-Host "Could not start on port $port. Is the mixer already running in another window?" -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit 1
}

Write-Host "Ivan is Ivan - Live Mixer running at http://localhost:$port/" -ForegroundColor Cyan
Write-Host 'Keep this window open during the show. Close it to stop the mixer.'
try { Start-Process "http://localhost:$port/" } catch { Write-Host "Open http://localhost:$port/ in Chrome." }

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request; $res = $ctx.Response
        try {
            # Blocks DNS-rebinding: only answer requests addressed to localhost.
            if ($allowedHosts -notcontains $req.Headers['Host']) { Send-Json $res '{"error":"forbidden"}' 403; continue }
            $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)

            if ($req.HttpMethod -eq 'POST') {
                if ($path -ne '/api/save') { Send-Json $res '{"error":"not found"}' 404; continue }
                # Custom header + JSON type means other websites cannot send this (browser preflight blocks them).
                if ($req.Headers['X-Key'] -ne $key) { Send-Json $res '{"error":"bad key"}' 403; continue }
                if ($req.ContentLength64 -le 0 -or $req.ContentLength64 -gt $maxBody) { Send-Json $res '{"error":"bad size"}' 400; continue }
                $reader = New-Object IO.StreamReader($req.InputStream, [Text.Encoding]::UTF8)
                $body = $reader.ReadToEnd(); $reader.Close()
                if (-not $body.TrimStart().StartsWith('{')) { Send-Json $res '{"error":"bad json"}' 400; continue }
                if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }
                $tmp = "$dataFile.tmp"
                [IO.File]::WriteAllText($tmp, $body, $utf8)
                Move-Item -LiteralPath $tmp -Destination $dataFile -Force
                $daily = Join-Path $dataDir ('backup-' + (Get-Date -Format 'yyyy-MM-dd') + '.json')
                [IO.File]::WriteAllText($daily, $body, $utf8)
                Get-ChildItem -Path $dataDir -Filter 'backup-*.json' | Sort-Object Name -Descending |
                    Select-Object -Skip $keepDaily | Remove-Item -Force
                Send-Json $res '{"ok":true}'; continue
            }

            if ($path -eq '/api/info') { Send-Json $res ('{"key":"' + $key + '"}'); continue }
            if ($path -eq '/api/poll') {
                $items = @($pending | ForEach-Object { '"' + $_ + '"' })
                $pending.Clear()
                Send-Json $res ('[' + ($items -join ',') + ']'); continue
            }
            if ($path.StartsWith('/api/cmd/')) {
                $name = $path.Substring(9)
                if ($req.QueryString['k'] -ne $key) { Send-Json $res '{"error":"bad key"}' 403; continue }
                if ($name -notmatch '^[A-Za-z0-9]{1,24}$') { Send-Json $res '{"error":"bad command"}' 400; continue }
                if ($pending.Count -lt 50) { $pending.Add($name) }
                Send-Json $res ('{"ok":true,"cmd":"' + $name + '"}'); continue
            }
            if ($path -eq '/api/load') {
                if (Test-Path $dataFile) { Send-Bytes $res ([IO.File]::ReadAllBytes($dataFile)) 'application/json' }
                else { Send-Json $res '{}' }
                continue
            }
            if ($path -eq '/api/resolve') {
                $handle = "$($req.QueryString['h'])".TrimStart('@')
                if ($handle -notmatch '^[\w.\-]{3,30}$') { Send-Json $res '{"error":"bad handle"}' 400; continue }
                try { $page = Get-YouTube "https://www.youtube.com/@$handle" } catch { Send-Json $res '{"error":"Could not reach YouTube"}' 502; continue }
                $m = [regex]::Match($page, '<link rel="canonical" href="https://www\.youtube\.com/channel/(UC[\w-]{22})"')
                if (-not $m.Success) { $m = [regex]::Match($page, '"externalId":"(UC[\w-]{22})"') }
                if (-not $m.Success) { $m = [regex]::Match($page, '"channelId":"(UC[\w-]{22})"') }
                if ($m.Success) { Send-Json $res ('{"channelId":"' + $m.Groups[1].Value + '"}') }
                else { Send-Json $res '{"error":"Channel not found"}' }
                continue
            }
            if ($path -eq '/api/feed') {
                $ch = "$($req.QueryString['c'])"
                if ($ch -notmatch '^UC[\w-]{22}$') { Send-Json $res '{"error":"bad channel id"}' 400; continue }
                try { $xml = Get-YouTube "https://www.youtube.com/feeds/videos.xml?channel_id=$ch" } catch { Send-Json $res '{"error":"Could not reach YouTube"}' 502; continue }
                Send-Bytes $res ($utf8.GetBytes($xml)) 'application/xml'; continue
            }

            if ($path -eq '/') { $path = '/index.html' }
            $full = [IO.Path]::GetFullPath((Join-Path $root $path.TrimStart('/')))
            $ext = [IO.Path]::GetExtension($full).ToLower()
            if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or
                -not (Test-Path -LiteralPath $full -PathType Leaf) -or
                $path.StartsWith('/api/') -or $path.StartsWith('/data/') -or ($blockedExt -contains $ext)) {
                Send-Bytes $res ($utf8.GetBytes('Not found')) 'text/plain' 404; continue
            }
            $type = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
            Send-Bytes $res ([IO.File]::ReadAllBytes($full)) $type
        } catch {
            try { $res.StatusCode = 500; $res.Close() } catch {}
        }
    }
} finally {
    $listener.Stop()
}
