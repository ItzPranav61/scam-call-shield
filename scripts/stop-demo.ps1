$ErrorActionPreference = 'Stop'
$listeners = @(foreach ($port in @(8787, 3000)) {
    Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
})
if (-not $listeners.Count) { Write-Host 'No listeners on ports 8787 or 3000.'; exit 0 }
foreach ($ownerId in @($listeners.OwningProcess | Sort-Object -Unique)) {
    $current = @(Get-NetTCPConnection -State Listen -OwningProcess $ownerId -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalPort -in @(8787, 3000) })
    if (-not $current.Count) { continue }
    if ($ownerId -eq $PID) { throw 'Refusing to stop the current PowerShell process.' }
    Stop-Process -Id $ownerId -ErrorAction Stop
    Write-Host "Stopped listener process ID $ownerId on demo port(s) $($current.LocalPort -join ', ')."
}
Write-Host 'Server windows may remain open; close them manually. No process trees or other ports were targeted.'
