param(
    [switch]$NoReload
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== SoftScale Backend Runner (LOCAL ONLY) ===`n" -ForegroundColor Cyan

# -------------------------
# Paths
# -------------------------
$repoRoot   = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"

$cacheDir   = Join-Path $backendDir ".cache"

$venvDir    = Join-Path $backendDir ".venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"

$requirements  = Join-Path $backendDir "requirements.txt"
$envFile       = Join-Path $repoRoot ".env"

$preloadScript = Join-Path $backendDir "ai\models\preload_all_models.py"

# -------------------------
# Ensure directories
# -------------------------
function Ensure-Dirs {
    Write-Host "[Setup] Checking backend/.cache and .venv..." -ForegroundColor Yellow

    if (!(Test-Path $cacheDir)) {
        New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
        Write-Host "[Setup] Created $cacheDir" -ForegroundColor Green
    }

    if (!(Test-Path $venvDir)) {
        Write-Host "[Setup] Creating virtual environment..." -ForegroundColor Green
        py -3.12 -m venv $venvDir
    }
}

# -------------------------
# Load .env
# -------------------------
function Load-Env {
    Write-Host "[Env] Loading .env..." -ForegroundColor Yellow

    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
                [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
            }
        }
    }
}

# -------------------------
# Install dependencies
# -------------------------
function Install-BackendDeps {
    Write-Host "[Backend] Installing dependencies..." -ForegroundColor Yellow

    if (!(Test-Path $venvPython)) {
        throw "venv python not found!"
    }

    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r $requirements
}

# -------------------------
# Preload models
# -------------------------
function Preload-Models {
    Write-Host "`n[Models] Preloading AI models..." -ForegroundColor Cyan

    $models = @(
        "intent_model",
        "embedding_model",
        "classifier_model",
        "ranking_model",
        "response_model"
    )

    foreach ($model in $models) {
        Write-Host "`n[Model] Loading: $model" -ForegroundColor Yellow

        $env:CURRENT_MODEL = $model

        & $venvPython $preloadScript $model

        if ($LASTEXITCODE -ne 0) {
            throw "[Model] Failed to load: $model"
        }

        Write-Host "[Model] Loaded ✔ $model" -ForegroundColor Green
    }

    Write-Host "`n[Models] ALL MODELS READY ✔" -ForegroundColor Green
}

# -------------------------
# Start backend
# -------------------------
function Start-Backend {
    Write-Host "`n[Backend] Starting FastAPI (uvicorn)..." -ForegroundColor Cyan

    if ($NoReload) {
        Start-Process powershell -ArgumentList @(
            "-NoExit",
            "-Command",
            "cd '$backendDir'; `$env:PYTHONUNBUFFERED=1; & '$venvPython' -m uvicorn app:app --host 0.0.0.0 --port 8000"
        )
    }
    else {
        Start-Process powershell -ArgumentList @(
            "-NoExit",
            "-Command",
            "cd '$backendDir'; `$env:PYTHONUNBUFFERED=1; & '$venvPython' -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload"
        )
    }

    Write-Host "[Backend] Started ✔" -ForegroundColor Green
}

# -------------------------
# Health check
# -------------------------
function Wait-Backend {
    Write-Host "`n[Health] Waiting for backend..." -ForegroundColor Yellow

    $timeout = 120
    $start = Get-Date

    while ((Get-Date) -lt $start.AddSeconds($timeout)) {
        try {
            $res = Invoke-WebRequest "http://127.0.0.1:8000/docs" -UseBasicParsing -TimeoutSec 2
            if ($res.StatusCode -eq 200) {
                Write-Host "[Health] Backend is LIVE ✔" -ForegroundColor Green
                return
            }
        } catch {}

        Start-Sleep 2
    }

    Write-Host "[Health] Backend NOT responding ⚠" -ForegroundColor Red
}

# -------------------------
# DB info
# -------------------------
function Test-DB {
    Write-Host "`n[DB] Environment variables:" -ForegroundColor Yellow

    Write-Host "DB_HOST = $env:DB_HOST"
    Write-Host "DB_PORT = $env:DB_PORT"
    Write-Host "DB_NAME = $env:DB_NAME"
}

# -------------------------
# RUN FLOW
# -------------------------
Ensure-Dirs
Load-Env
Test-DB

Write-Host "`nStep 1: Installing dependencies..." -ForegroundColor Cyan
Install-BackendDeps

Write-Host "`nStep 2: Preloading models..." -ForegroundColor Cyan
Preload-Models

Write-Host "`nStep 3: Starting backend..." -ForegroundColor Cyan
Start-Backend

Write-Host "`nStep 4: Health check..." -ForegroundColor Cyan
Wait-Backend

Write-Host "`n=== READY ===" -ForegroundColor Green
Write-Host "API: http://127.0.0.1:8000/docs"
