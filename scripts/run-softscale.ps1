Param(
    [switch]$SkipFrontend,
    [switch]$Strict
)

$ErrorActionPreference = "Stop"

Write-Host "Starting SoftScale helper script..." -ForegroundColor Cyan
if ($Strict) {
    Write-Host "[Mode] Strict mode enabled: no installs/downloads allowed." -ForegroundColor Yellow
}

$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot    = Split-Path -Parent $scriptDir
$backendDir  = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$script:BackendVenvPython = Join-Path $backendDir ".venv\Scripts\python.exe"

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

function Ensure-Database {
    Write-Host "`n[Database] Starting Postgres in Docker (data persisted in volume)..." -ForegroundColor Yellow
    Push-Location $repoRoot
    try {
        # Prefer modern 'docker compose' syntax
        docker compose up -d postgres
    } catch {
        Write-Host "[Database] 'docker compose' failed, trying 'docker-compose'..." -ForegroundColor Yellow
        try {
            docker-compose up -d postgres
        } catch {
            Write-Host "[Database] Failed to start Postgres. Is Docker running?" -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Red
        }
    }
    Pop-Location
}

function Ensure-BackendEnv {
    Write-Host "`n[Backend] Checking Python virtual environment..." -ForegroundColor Yellow
    $venvPath = Join-Path $backendDir ".venv"
    $venvPython = $script:BackendVenvPython
    $requirementsFile = Join-Path $backendDir "requirements.txt"
    $stateDir = Join-Path $backendCacheRoot "state"
    $requirementsHashFile = Join-Path $stateDir "requirements.sha256"

    if (-not (Test-Path $venvPython)) {
        if ($Strict) {
            throw "[Backend] Strict mode: .venv missing at $venvPath. Refusing to create it."
        }
        Write-Host "[Backend] Creating virtual environment at $venvPath" -ForegroundColor Green
        Push-Location $backendDir
        # Use Windows Python launcher directly to avoid Microsoft Store alias issues
        py -3.12 -m venv .venv
        Pop-Location
        # Recompute path in case it was just created
        $venvPython = Join-Path $venvPath "Scripts\python.exe"
        $script:BackendVenvPython = $venvPython
    }

    if (-not (Test-Path $venvPython)) {
        Write-Host "[Backend] Virtual environment Python not found at $venvPython." -ForegroundColor Red
        Write-Host "Please ensure Python 3 is installed and re-run the script." -ForegroundColor Red
        return
    } else {
        Write-Host "[Backend] Virtual environment already exists. Skipping creation." -ForegroundColor Green
    }

    New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
    $currentReqHash = (Get-FileHash -Path $requirementsFile -Algorithm SHA256).Hash
    $savedReqHash = if (Test-Path $requirementsHashFile) { (Get-Content $requirementsHashFile -Raw).Trim() } else { "" }

    if (($savedReqHash -eq $currentReqHash) -and (Test-Path $venvPython)) {
        Write-Host "[Backend] requirements.txt unchanged. Skipping pip install." -ForegroundColor Green
    } else {
        if ($Strict) {
            throw "[Backend] Strict mode: requirements changed or not yet installed. Refusing pip install."
        }
        Write-Host "[Backend] Installing/updating Python dependencies..." -ForegroundColor Yellow
        Push-Location $backendDir
        & $venvPython -m pip install --upgrade pip
        & $venvPython -m pip install -r requirements.txt
        Pop-Location
        Set-Content -Path $requirementsHashFile -Value $currentReqHash
    }
}

function Ensure-Models {
    Write-Host "`n[Models] Preloading/checking all backend AI models..." -ForegroundColor Yellow
    Push-Location $backendDir
    try {
        $args = @("scripts/preload_all_models.py")
        if ($Strict) {
            $args += "--check-only"
        }

        & $script:BackendVenvPython @args
        if ($LASTEXITCODE -ne 0) {
            throw "[Models] preload_all_models.py failed with exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
}

function Start-BackendWindow {
    Write-Host "[Backend] Opening new PowerShell window..." -ForegroundColor Yellow
    $backendHFCache = Join-Path $backendCacheRoot "huggingface"
    $backendTorchCache = Join-Path $backendCacheRoot "torch"
    $backendSTCache = Join-Path $backendCacheRoot "sentence_transformers"
    $backendPipCache = Join-Path $backendCacheRoot "pip"
    $backendCommand = @"
cd `"$backendDir`"
`$env:HF_HOME = `"$backendHFCache`"
`$env:TORCH_HOME = `"$backendTorchCache`"
`$env:SENTENCE_TRANSFORMERS_HOME = `"$backendSTCache`"
`$env:PIP_CACHE_DIR = `"$backendPipCache`"

# Set default env vars if not already in .env
if (-not (Test-Path ".env")) {
    Write-Host "Creating default .env file for backend..."
    @'
DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=talent_match_db
DB_USER=postgres
DB_PASSWORD=4681
JWT_SECRET_KEY=change-this-secret
CORS_ORIGINS=*
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
'@ | Out-File -Encoding UTF8 ".env"
}

Write-Host "Starting backend with uvicorn..."
& `"$backendDir\.venv\Scripts\python.exe`" -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
Pause
"@

    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand
}

function Ensure-FrontendDeps {
    if ($SkipFrontend) {
        Write-Host "[Frontend] Skipped by user flag." -ForegroundColor Yellow
        return
    }

    Write-Host "`n[Frontend] Checking Node dependencies..." -ForegroundColor Yellow
    if (-not (Test-Path $frontendDir)) {
        Write-Host "[Frontend] Frontend directory not found at $frontendDir" -ForegroundColor Red
        return
    }

    $nodeModules = Join-Path $frontendDir "node_modules"

    if (-not (Test-Path $nodeModules)) {
        if ($Strict) {
            throw "[Frontend] Strict mode: node_modules missing at $nodeModules. Refusing npm install."
        }
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
}

function Start-FrontendWindow {
    if ($SkipFrontend) {
        return
    }

    Write-Host "[Frontend] Opening new PowerShell window..." -ForegroundColor Yellow
    $frontendCommand = @"
cd `"$frontendDir`"
Write-Host "Starting frontend (npm start)..."
npm start
Pause
"@

    Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand
}

Write-Host "`nStep 1: Ensuring database (Docker Postgres)..." -ForegroundColor Cyan
Ensure-Database

Write-Host "`nStep 2: Ensuring backend environment..." -ForegroundColor Cyan
Ensure-BackendEnv

Write-Host "`nStep 3: Checking required models..." -ForegroundColor Cyan
Ensure-Models

Write-Host "`nStep 4: Ensuring frontend dependencies..." -ForegroundColor Cyan
Ensure-FrontendDeps

Write-Host "`nStep 5: Opening backend and frontend PowerShell windows..." -ForegroundColor Cyan
Start-BackendWindow
Start-FrontendWindow

Write-Host "`nAll done. Backend and frontend should be starting in separate windows." -ForegroundColor Cyan

