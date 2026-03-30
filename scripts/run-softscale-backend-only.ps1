param(
    [string]$BackendMode = "local",
    [switch]$NoReload
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

$repoRoot   = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"
$venvDir    = Join-Path $backendDir ".venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"
$requirements = Join-Path $backendDir "requirements.txt"

$envFile = Join-Path $repoRoot ".env"

function Load-Env {
    if (!(Test-Path $envFile)) { return }
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}

function Ensure-Venv {
    if (!(Test-Path $venvPython)) {
        Write-Host "[Setup] Creating venv..." -ForegroundColor Yellow
        py -3.12 -m venv $venvDir
    }
}

function Install-BackendDeps {
    Write-Host "[Backend] Installing dependencies..." -ForegroundColor Yellow
    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r $requirements
}

function Start-Backend {
    Write-Host "[Backend] Starting uvicorn..." -ForegroundColor Cyan
    $shouldReload = -not $NoReload
    if ($BackendMode -match "prod|production") { $shouldReload = $false }

    $args = @(
        "-m", "uvicorn",
        "app:app",
        "--host", "0.0.0.0",
        "--port", "8000"
    )
    if ($shouldReload) { $args += "--reload" }

    Start-Process -FilePath $venvPython -ArgumentList $args -WorkingDirectory $backendDir -NoNewWindow | Out-Null
}

function Wait-Backend {
    Write-Host "[Health] Waiting for backend..." -ForegroundColor Yellow
    $timeoutSeconds = 120
    $start = Get-Date

    while ((Get-Date) -lt $start.AddSeconds($timeoutSeconds)) {
        try {
            $res = Invoke-WebRequest "http://127.0.0.1:8000/docs" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($res.StatusCode -eq 200) {
                Write-Host "[Health] Backend is LIVE" -ForegroundColor Green
                return
            }
        }
        catch { }
        Start-Sleep 2
    }

    throw "Backend NOT responding within ${timeoutSeconds}s"
}

Load-Env
Ensure-Venv
Install-BackendDeps
Start-Backend
Wait-Backend
Write-Host "READY - http://127.0.0.1:8000/docs"

<#
#param(
#    [string]$BackendMode = "local",
#    [switch]$NoReload
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

Write-Host "`n=== SoftScale Backend Runner ===`n" -ForegroundColor Cyan

# -------------------------
# Paths
# -------------------------
$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"

$cacheDir = Join-Path $backendDir ".cache"
$venvDir = Join-Path $backendDir ".venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"

$requirements = Join-Path $backendDir "requirements.txt"
$envFile = Join-Path $repoRoot ".env"
$preloadScript = Join-Path $backendDir "scripts\preload_all_models.py"

function Ensure-Dirs {
    Write-Host "[Setup] Ensuring backend cache + venv..." -ForegroundColor Yellow

    if (!(Test-Path $cacheDir)) {
        New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
        Write-Host "[Setup] Created $cacheDir" -ForegroundColor Green
    }

    if (!(Test-Path $venvDir)) {
        Write-Host "[Setup] Creating virtual environment..." -ForegroundColor Green
        py -3.12 -m venv $venvDir
    }
}

function Load-Env {
    if (!(Test-Path $envFile)) {
        Write-Host "[Env] .env not found (skipping): $envFile" -ForegroundColor Yellow
        return
    }

    Write-Host "[Env] Loading .env..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}

function Install-BackendDeps {
    Write-Host "[Backend] Installing dependencies..." -ForegroundColor Yellow

    if (!(Test-Path $venvPython)) {
        throw "venv python not found at: $venvPython"
    }

    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r $requirements
}

function Preload-Models {
    Write-Host "`n[Models] Preloading runtime models..." -ForegroundColor Cyan

    if (!(Test-Path $preloadScript)) {
        throw "preload script not found: $preloadScript"
    }

    & $venvPython $preloadScript
}

function Start-Backend {
    Write-Host "`n[Backend] Starting uvicorn..." -ForegroundColor Cyan

    $shouldReload = -not $NoReload
    if ($BackendMode -match "prod|production") {
        $shouldReload = $false
    }

    $args = @(
        "-m", "uvicorn",
        "app:app",
        "--host", "0.0.0.0",
        "--port", "8000"
    )
    if ($shouldReload) {
        $args += "--reload"
    }

    Start-Process -FilePath $venvPython -ArgumentList $args -WorkingDirectory $backendDir -NoNewWindow | Out-Null
    Write-Host "[Backend] Started ✔" -ForegroundColor Green
}

function Wait-Backend {
    Write-Host "`n[Health] Waiting for backend..." -ForegroundColor Yellow

    $timeoutSeconds = 120
    $start = Get-Date

    while ((Get-Date) -lt $start.AddSeconds($timeoutSeconds)) {
        try {
            $res = Invoke-WebRequest "http://127.0.0.1:8000/docs" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($res.StatusCode -eq 200) {
                Write-Host "[Health] Backend is LIVE ✔" -ForegroundColor Green
                return
            }
        }
        catch {
            # ignore transient errors during startup
        }

        Start-Sleep 2
    }

    throw "Backend NOT responding at http://127.0.0.1:8000/docs within ${timeoutSeconds}s"
}

# -------------------------
# Run flow
# -------------------------
Ensure-Dirs
Load-Env

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
# >
return

param(
    [string]$BackendMode = "local",
    [switch]$NoReload
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

Write-Host "`n=== SoftScale Backend Runner ===`n" -ForegroundColor Cyan

# -------------------------
# Paths
# -------------------------
$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"

$cacheDir = Join-Path $backendDir ".cache"
$venvDir = Join-Path $backendDir ".venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"

$requirements = Join-Path $backendDir "requirements.txt"
$envFile = Join-Path $repoRoot ".env"
$preloadScript = Join-Path $backendDir "scripts\preload_all_models.py"

function Ensure-Dirs {
    Write-Host "[Setup] Ensuring backend cache + venv..." -ForegroundColor Yellow

    if (!(Test-Path $cacheDir)) {
        New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
        Write-Host "[Setup] Created $cacheDir" -ForegroundColor Green
    }

    if (!(Test-Path $venvDir)) {
        Write-Host "[Setup] Creating virtual environment..." -ForegroundColor Green
        py -3.12 -m venv $venvDir
    }
}

function Load-Env {
    if (!(Test-Path $envFile)) {
        Write-Host "[Env] .env not found (skipping): $envFile" -ForegroundColor Yellow
        return
    }

    Write-Host "[Env] Loading .env..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}

function Install-BackendDeps {
    Write-Host "[Backend] Installing dependencies..." -ForegroundColor Yellow

    if (!(Test-Path $venvPython)) {
        throw "venv python not found at: $venvPython"
    }

    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r $requirements
}

function Preload-Models {
    Write-Host "`n[Models] Preloading runtime models..." -ForegroundColor Cyan

    if (!(Test-Path $preloadScript)) {
        throw "preload script not found: $preloadScript"
    }

    & $venvPython $preloadScript
}

function Start-Backend {
    Write-Host "`n[Backend] Starting uvicorn..." -ForegroundColor Cyan

    $shouldReload = -not $NoReload
    if ($BackendMode -match "prod|production") {
        $shouldReload = $false
    }

    $args = @(
        "-m", "uvicorn",
        "app:app",
        "--host", "0.0.0.0",
        "--port", "8000"
    )
    if ($shouldReload) {
        $args += "--reload"
    }

    Start-Process -FilePath $venvPython -ArgumentList $args -WorkingDirectory $backendDir -NoNewWindow | Out-Null
    Write-Host "[Backend] Started ✔" -ForegroundColor Green
}

function Wait-Backend {
    Write-Host "`n[Health] Waiting for backend..." -ForegroundColor Yellow

    $timeoutSeconds = 120
    $start = Get-Date

    while ((Get-Date) -lt $start.AddSeconds($timeoutSeconds)) {
        try {
            $res = Invoke-WebRequest "http://127.0.0.1:8000/docs" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($res.StatusCode -eq 200) {
                Write-Host "[Health] Backend is LIVE ✔" -ForegroundColor Green
                return
            }
        }
        catch {
            # ignore transient errors during startup
        }

        Start-Sleep 2
    }

    throw "Backend NOT responding at http://127.0.0.1:8000/docs within ${timeoutSeconds}s"
}

# -------------------------
# Run flow
# -------------------------
Ensure-Dirs
Load-Env

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

param(
    [string]$BackendMode = "local",
    [switch]$NoReload
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

Write-Host "`n=== SoftScale Backend Runner ===`n" -ForegroundColor Cyan

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
$preloadScript = Join-Path $backendDir "scripts\preload_all_models.py"

function Ensure-Dirs {
    Write-Host "[Setup] Ensuring backend cache + venv..." -ForegroundColor Yellow

    if (!(Test-Path $cacheDir)) {
        New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
        Write-Host "[Setup] Created $cacheDir" -ForegroundColor Green
    }

    if (!(Test-Path $venvDir)) {
        Write-Host "[Setup] Creating virtual environment..." -ForegroundColor Green
        py -3.12 -m venv $venvDir
    }
}

function Load-Env {
    if (!(Test-Path $envFile)) {
        Write-Host "[Env] .env not found (skipping): $envFile" -ForegroundColor Yellow
        return
    }

    Write-Host "[Env] Loading .env..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}

function Install-BackendDeps {
    Write-Host "[Backend] Installing dependencies..." -ForegroundColor Yellow

    if (!(Test-Path $venvPython)) {
        throw "venv python not found at: $venvPython"
    }

    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r $requirements
}

function Preload-Models {
    Write-Host "`n[Models] Preloading runtime models..." -ForegroundColor Cyan

    if (!(Test-Path $preloadScript)) {
        throw "preload script not found: $preloadScript"
    }

    & $venvPython $preloadScript
}

function Start-Backend {
    Write-Host "`n[Backend] Starting uvicorn..." -ForegroundColor Cyan

    $shouldReload = -not $NoReload
    if ($BackendMode -match "prod|production") {
        $shouldReload = $false
    }

    $args = @(
        "-m", "uvicorn",
        "app:app",
        "--host", "0.0.0.0",
        "--port", "8000"
    )
    if ($shouldReload) {
        $args += "--reload"
    }

    Start-Process -FilePath $venvPython `
        -ArgumentList $args `
        -WorkingDirectory $backendDir `
        -NoNewWindow | Out-Null

    Write-Host "[Backend] Started ✔" -ForegroundColor Green
}

function Wait-Backend {
    Write-Host "`n[Health] Waiting for backend..." -ForegroundColor Yellow

    $timeoutSeconds = 120
    $start = Get-Date

    while ((Get-Date) -lt $start.AddSeconds($timeoutSeconds)) {
        try {
            $res = Invoke-WebRequest "http://127.0.0.1:8000/docs" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($res.StatusCode -eq 200) {
                Write-Host "[Health] Backend is LIVE ✔" -ForegroundColor Green
                return
            }
        }
        catch {
            # Ignore transient errors while starting up.
        }

        Start-Sleep 2
    }

    throw "Backend NOT responding at http://127.0.0.1:8000/docs within ${timeoutSeconds}s"
}

# -------------------------
# Run flow
# -------------------------
Ensure-Dirs
Load-Env

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

param(
    [switch]$NoReload
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

Write-Host "`n=== SoftScale Backend Runner ===`n" -ForegroundColor Cyan

# -------------------------
# Paths (STRICT)
# -------------------------
$repoRoot   = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"

# CACHE MUST BE HERE: backend/.cache
$cacheDir   = Join-Path $backendDir ".cache"

# venv inside backend
$venvDir    = Join-Path $backendDir ".venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"

$requirements  = Join-Path $backendDir "requirements.txt"
$envFile       = Join-Path $repoRoot ".env"
$preloadScript = Join-Path $backendDir "ai\models\preload_all_models.py"

# -------------------------
# Ensure folders
# -------------------------
function Ensure-Dirs {
    Write-Host "[Setup] Ensuring backend/.cache and .venv..." -ForegroundColor Yellow

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
# Install deps
# -------------------------
function Install-BackendDeps {
    Write-Host "[Backend] Installing dependencies..." -ForegroundColor Yellow

    if (!(Test-Path $venvPython)) {
        throw "venv not found!"
    }

    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r $requirements
}

# -------------------------
# Preload models
# -------------------------
function Preload-Models {
    Write-Host "`n[Models] Preloading 5 AI models..." -ForegroundColor Cyan

    $models = @(
        "intent_model",
        "embedding_model",
        "classifier_model",
        "ranking_model",
        "response_model"
    )

    foreach ($model in $models) {
        Write-Host "`n[Model] Loading: $model ..." -ForegroundColor Yellow

        $env:CURRENT_MODEL = $model

        & $venvPython $preloadScript $model

        if ($LASTEXITCODE -ne 0) {
            throw "[Model] Failed: $model"
        }

        Write-Host "[Model] $model ✔ loaded successfully" -ForegroundColor Green
    }

    Write-Host "`n[Models] ALL MODELS READY ✔" -ForegroundColor Green
}

# -------------------------
# Start backend
# -------------------------
function Start-Backend {
    Write-Host "`n[Backend] Starting uvicorn..." -ForegroundColor Cyan

    $cmd = if ($NoReload) {
        "uvicorn app:app --host 0.0.0.0 --port 8000"
    } else {
        "uvicorn app:app --host 0.0.0.0 --port 8000 --reload"
    }

    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "cd '$backendDir'; `$env:PYTHONUNBUFFERED=1; $cmd"
    )

    Write-Host "[Backend] Started ✔" -ForegroundColor Green
}

# -------------------------
# Health check
# -------------------------
function Wait-Backend {
    Write-Host "`n[Health] Waiting for backend..." -ForegroundColor Yellow
    Start-Sleep 2
}

# -------------------------
# DB check
# -------------------------
function Test-DB {
    Write-Host "`n[DB] Checking environment..." -ForegroundColor Yellow

    Write-Host "[DB] HOST = $env:DB_HOST"
    Write-Host "[DB] PORT = $env:DB_PORT"
    Write-Host "[DB] NAME = $env:DB_NAME"
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
#>
