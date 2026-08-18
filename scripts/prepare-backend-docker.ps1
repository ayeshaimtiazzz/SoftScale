Param(
    [string]$PythonVersion = "3.12"
)

$ErrorActionPreference = "Stop"

Write-Host "Preparing backend virtualenv, models, and Docker backend..." -ForegroundColor Cyan

$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot   = Split-Path -Parent $scriptsDir
$backendDir = Join-Path $repoRoot "backend"

# Project-local cache directories
$backendCacheRoot = Join-Path $backendDir ".cache"
$env:HF_HOME = Join-Path $backendCacheRoot "huggingface"
$env:TORCH_HOME = Join-Path $backendCacheRoot "torch"
$env:SENTENCE_TRANSFORMERS_HOME = Join-Path $backendCacheRoot "sentence_transformers"
$env:PIP_CACHE_DIR = Join-Path $backendCacheRoot "pip"

New-Item -ItemType Directory -Path $env:HF_HOME -Force | Out-Null
New-Item -ItemType Directory -Path $env:TORCH_HOME -Force | Out-Null
New-Item -ItemType Directory -Path $env:SENTENCE_TRANSFORMERS_HOME -Force | Out-Null
New-Item -ItemType Directory -Path $env:PIP_CACHE_DIR -Force | Out-Null

if (-not (Test-Path $backendDir)) {
    Write-Host "Backend directory not found at $backendDir" -ForegroundColor Red
    exit 1
}

$venvPath   = Join-Path $backendDir ".venv"
$venvPython = Join-Path $venvPath "Scripts\python.exe"

Write-Host "`n[Step 1] Ensure backend virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path $venvPython)) {
    Write-Host "Creating virtual environment at $venvPath using py -$PythonVersion ..." -ForegroundColor Green
    Push-Location $backendDir
    py "-$PythonVersion" -m venv .venv
    Pop-Location
} else {
    Write-Host "Virtual environment already exists at $venvPath. Reusing." -ForegroundColor Green
}

if (-not (Test-Path $venvPython)) {
    Write-Host "Virtual environment Python not found at $venvPython. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "`n[Step 2] Ensure backend Python dependencies (pip install -r requirements.txt)..." -ForegroundColor Yellow
Push-Location $backendDir
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r requirements.txt
Pop-Location

Write-Host "`n[Step 3] Warm up ML models (downloads happen once into cache)..." -ForegroundColor Yellow
$warmScript = Join-Path $backendDir "warm_models.py"
if (-not (Test-Path $warmScript)) {
    Write-Host "warm_models.py not found at $warmScript, skipping model warm-up." -ForegroundColor Yellow
} else {
    Push-Location $backendDir
    & $venvPython "warm_models.py"
    Pop-Location
}

Write-Host "`n[Step 4] Build backend Docker image (installs inside image once, cached later)..." -ForegroundColor Yellow
Push-Location $repoRoot
try {
    docker compose build backend
} catch {
    Write-Host "'docker compose' failed, trying 'docker-compose build backend'..." -ForegroundColor Yellow
    docker-compose build backend
}
Pop-Location

Write-Host "`n[Step 5] Start backend + postgres via Docker..." -ForegroundColor Yellow
Push-Location $repoRoot
try {
    docker compose up -d postgres backend
} catch {
    Write-Host "'docker compose' failed, trying 'docker-compose up -d postgres backend'..." -ForegroundColor Yellow
    docker-compose up -d postgres backend
}
Pop-Location

Write-Host "`nBackend virtualenv prepared, models warmed, and Docker backend started." -ForegroundColor Cyan

