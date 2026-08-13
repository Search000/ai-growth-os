# AI Growth OS Backup Script
# Backs up database and .env files (NOT the model weights, those are re-downloadable)

$ErrorActionPreference = "Stop"
$root = "F:\AI_Growth_OS"
$backupRoot = "$root\backups"
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupDir = "$backupRoot\backup_$timestamp"

Write-Host "Creating backup at $backupDir..."
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

if (Test-Path "$root\data\app.db") {
    Copy-Item "$root\data\app.db" -Destination "$backupDir\app.db"
    Write-Host "Backed up database."
} else {
    Write-Host "No database found, skipping."
}

if (Test-Path "$root\apps\api\.env") {
    Copy-Item "$root\apps\api\.env" -Destination "$backupDir\api.env"
    Write-Host "Backed up API .env."
}

$allBackups = Get-ChildItem -Path $backupRoot -Directory | Sort-Object CreationTime -Descending
if ($allBackups.Count -gt 10) {
    $toDelete = $allBackups | Select-Object -Skip 10
    foreach ($old in $toDelete) {
        Remove-Item $old.FullName -Recurse -Force
        Write-Host "Removed old backup: $($old.Name)"
    }
}

Write-Host "Backup complete: $backupDir"
