# Ivan is Ivan - Live Mixer local server (Windows, no install needed).
# Serves the mixer on http://localhost:8765 (this computer only) and relays
# Stream Deck button presses to the mixer page.
#   /api/cmd/<name>?k=<key>  Stream Deck "Website" action (GET in background)
#   /api/poll                mixer page picks up pending commands
#   /api/info                mixer page reads the control key

$ErrorActionPreference = 'Stop'
$port = 8765
$root = [IO.Path]::GetFullPath($PSScriptRoot)
if (-not $root.EndsWith('\')) { $root += '\' }

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

function Send-Bytes($res, [byte[]]$body, $type, $status = 200) {
    $res.StatusCode = $status
    $res.ContentType = $type
    $res.Headers.Add('Cache-Control', 'no-store')
    $res.ContentLength64 = $body.Length
    $res.OutputStream.Write($body, 0, $body.Length)
    $res.Close()
}
function Send-Json($res, $json, $status = 200) {
    Send-Bytes $res ([Text.Encoding]::UTF8.GetBytes($json)) 'application/json' $status
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
Start-Process "http://localhost:$port/"

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request; $res = $ctx.Response
        try {
            # Blocks DNS-rebinding: only answer requests addressed to localhost.
            if ($allowedHosts -notcontains $req.Headers['Host']) { Send-Json $res '{"error":"forbidden"}' 403; continue }
            $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)

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

            if ($path -eq '/') { $path = '/index.html' }
            $full = [IO.Path]::GetFullPath((Join-Path $root $path.TrimStart('/')))
            $ext = [IO.Path]::GetExtension($full).ToLower()
            if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or
                -not (Test-Path -LiteralPath $full -PathType Leaf) -or
                $path.StartsWith('/api/') -or ($blockedExt -contains $ext)) {
                Send-Bytes $res ([Text.Encoding]::UTF8.GetBytes('Not found')) 'text/plain' 404; continue
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
