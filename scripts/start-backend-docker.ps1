Param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir

Write-Host "Starting backend in Docker..." -ForegroundColor Cyan

Push-Location $repoRoot
try {
    if (-not $SkipBuild) {
        Write-Host "[1/2] Building backend image..." -ForegroundColor Yellow
        try {
            docker compose build backend
        } catch {
            Write-Host "'docker compose' build failed, trying docker-compose..." -ForegroundColor Yellow
            docker-compose build backend
        }
    } else {
        Write-Host "[1/2] Skipping backend image build (-SkipBuild)." -ForegroundColor Yellow
    }

    Write-Host "[2/2] Starting postgres + backend services..." -ForegroundColor Yellow
    try {
        docker compose up -d postgres backend
    } catch {
        Write-Host "'docker compose' up failed, trying docker-compose..." -ForegroundColor Yellow
        docker-compose up -d postgres backend
    }
} finally {
    Pop-Location
}

Write-Host "Backend Docker service started. API: http://127.0.0.1:8000/docs" -ForegroundColor Green

