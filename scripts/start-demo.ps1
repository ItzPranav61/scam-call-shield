$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$listeners = @(foreach ($port in @(8787, 3000)) {
    Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
})
if ($listeners.Count) {
    foreach ($listener in $listeners) {
        Write-Host "Port $($listener.LocalPort) is occupied by process ID $($listener.OwningProcess). Stop it before starting the demo."
    }
    exit 1
}
Get-Command npm.cmd -ErrorAction Stop | Out-Null
$shellPath = (Get-Process -Id $PID).Path
$quotedRoot = $repoRoot.Replace("'", "''")
$relayCommand = @"
Set-Location -LiteralPath '$quotedRoot'
`$env:PORT = '8787'
`$env:MAX_SESSION_SECONDS = '300'
`$env:ALLOWED_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000'
`$env:DEBUG_TRANSCRIPTS = '0'
npm.cmd run dev:relay:live
"@
$webCommand = @"
Set-Location -LiteralPath '$quotedRoot'
`$env:NEXT_PUBLIC_RELAY_URL = 'ws://localhost:8787/ws'
npm.cmd run dev:web -- --port 3000
"@
foreach ($command in @($relayCommand, $webCommand)) {
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
    Start-Process -FilePath $shellPath -WorkingDirectory $repoRoot -WindowStyle Normal -ArgumentList @('-NoLogo', '-NoProfile', '-NoExit', '-EncodedCommand', $encoded)
}
$wait = [Diagnostics.Stopwatch]::StartNew()
$ready = $false
while ($wait.Elapsed.TotalSeconds -lt 45) {
    try {
        $health = Invoke-RestMethod -Uri 'http://localhost:8787/health' -TimeoutSec 2
        $web = Invoke-WebRequest -Uri 'http://localhost:3000/?record=1' -UseBasicParsing -TimeoutSec 2
        if ($health.ok -eq $true -and $health.mode -eq 'live' -and $web.StatusCode -eq 200) { $ready = $true; break }
    } catch { # The two visible server windows show sanitized startup diagnostics.
    }
    Start-Sleep -Milliseconds 250
}
if (-not $ready) {
    Write-Error 'Demo startup did not become ready. Check the relay and web windows; use scripts/stop-demo.ps1 to stop listeners.'
    exit 1
}
Start-Process 'http://localhost:3000/?record=1#interactive-demo-title'
Write-Host 'Demo ready. Confirm the green LIVE badge, microphone settings and consent before each synthetic take.'
