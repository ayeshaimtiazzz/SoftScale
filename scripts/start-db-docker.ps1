Param(
    [string]$ServiceName = "postgres"
)

$ErrorActionPreference = "Stop"

$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir

Write-Host "Starting Docker DB service: $ServiceName" -ForegroundColor Cyan

Push-Location $repoRoot
try {
    try {
        docker compose up -d $ServiceName
    } catch {
        Write-Host "'docker compose' failed, trying 'docker-compose'..." -ForegroundColor Yellow
        docker-compose up -d $ServiceName
    }
} finally {
    Pop-Location
}

Write-Host "Database service is up (or starting)." -ForegroundColor Green

