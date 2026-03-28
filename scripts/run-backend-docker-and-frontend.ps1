Param(
    [string]$PythonVersion = "3.12"
)

$ErrorActionPreference = "Stop"

Write-Host "Starting: backend+db in Docker, frontend locally..." -ForegroundColor Cyan

$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot   = Split-Path -Parent $scriptsDir
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = $repoRoot

if (-not (Test-Path $backendDir)) {
    Write-Host "Backend directory not found at $backendDir" -ForegroundColor Red
    exit 1
}

# Project-local caches to minimize re-downloads
$backendCacheRoot = Join-Path $backendDir ".cache"
$env:HF_HOME = Join-Path $backendCacheRoot "huggingface"
$env:TORCH_HOME = Join-Path $backendCacheRoot "torch"
$env:SENTENCE_TRANSFORMERS_HOME = Join-Path $backendCacheRoot "sentence_transformers"
$env:PIP_CACHE_DIR = Join-Path $backendCacheRoot "pip"

New-Item -ItemType Directory -Path $env:HF_HOME -Force | Out-Null
New-Item -ItemType Directory -Path $env:TORCH_HOME -Force | Out-Null
New-Item -ItemType Directory -Path $env:SENTENCE_TRANSFORMERS_HOME -Force | Out-Null
New-Item -ItemType Directory -Path $env:PIP_CACHE_DIR -Force | Out-Null

$venvPath   = Join-Path $backendDir ".venv"
$venvPython = Join-Path $venvPath "Scripts\python.exe"

Write-Host "`n[Step 1] Ensure backend virtualenv + deps (one-time installs)..." -ForegroundColor Yellow
if (-not (Test-Path $venvPython)) {
    Write-Host "Creating virtual environment at $venvPath using py -$PythonVersion ..." -ForegroundColor Green
    Push-Location $backendDir
    py "-$PythonVersion" -m venv .venv
    Pop-Location
}

if (-not (Test-Path $venvPython)) {
    Write-Host "Virtual environment Python not found at $venvPython. Aborting." -ForegroundColor Red
    exit 1
}

Push-Location $backendDir
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r requirements.txt
Pop-Location

Write-Host "`n[Step 2] Warm models (download once into project-local cache)..." -ForegroundColor Yellow
$warmScript = Join-Path $backendDir "warm_models.py"
if (Test-Path $warmScript) {
    Push-Location $backendDir
    & $venvPython "warm_models.py"
    Pop-Location
} else {
    Write-Host "warm_models.py not found, skipping model warm-up." -ForegroundColor Yellow
}

Write-Host "`n[Step 3] Build backend Docker image (installs cached; no re-download unless requirements change)..." -ForegroundColor Yellow
Push-Location $repoRoot
try {
    docker compose build backend
} catch {
    Write-Host "'docker compose' failed, trying 'docker-compose build backend'..." -ForegroundColor Yellow
    docker-compose build backend
}
Pop-Location

Write-Host "`n[Step 4] Start Postgres + backend in Docker..." -ForegroundColor Yellow
Push-Location $repoRoot
try {
    docker compose up -d postgres backend
} catch {
    Write-Host "'docker compose' failed, trying 'docker-compose up -d postgres backend'..." -ForegroundColor Yellow
    docker-compose up -d postgres backend
}
Pop-Location

Write-Host "`n[Step 5] Ensure frontend node_modules (install once) and start frontend..." -ForegroundColor Yellow
$nodeModules = Join-Path $frontendDir "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "[Frontend] node_modules not found. Running npm install once..." -ForegroundColor Green
    Push-Location $frontendDir
    if ((Test-Path "package-lock.json") -or (Test-Path "package.json")) {
        npm install
    } else {
        Write-Host "[Frontend] package.json not found. Skipping npm install." -ForegroundColor Red
    }
    Pop-Location
} else {
    Write-Host "[Frontend] node_modules already exists. Skipping npm install." -ForegroundColor Green
}

Write-Host "[Frontend] Opening new PowerShell window for npm run start..." -ForegroundColor Yellow
$frontendCommand = @"
cd `"$frontendDir`"
Write-Host "Starting frontend (npm run start)..."
npm run start
Pause
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand

Write-Host "`nDone. Backend+DB are running in Docker; frontend is running locally." -ForegroundColor Cyan

