param(
    [string]$BackendMode = "local",
    [switch]$NoReload,
    [string]$Port = "8000",
    [switch]$SkipPreload
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Be tolerant of wrapper argument quirks so demo startup does not fail.
if ($BackendMode -eq "-BackendMode" -and $Port -eq "local") {
    $BackendMode = "local"
    $Port = "8000"
}

$portNumber = 0
if (-not [int]::TryParse($Port, [ref]$portNumber)) {
    if ($Port -eq "local") {
        $portNumber = 8000
    } else {
        throw "Invalid -Port value: $Port"
    }
}

$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$backendDir = Join-Path $repoRoot "backend"
$venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"
$requirements = Join-Path $backendDir "requirements.txt"
$envFile = Join-Path $repoRoot ".env"
$preloadScript = Join-Path $backendDir "scripts\preload_all_models.py"

$backendCacheRoot = Join-Path $backendDir ".cache"
$backendHFCacheDir = Join-Path $backendCacheRoot "huggingface"
$backendTorchCacheDir = Join-Path $backendCacheRoot "torch"
$backendSTCacheDir = Join-Path $backendCacheRoot "sentence_transformers"
$backendPipCacheDir = Join-Path $backendCacheRoot "pip"

function Ensure-Dirs {
    foreach ($path in @($backendCacheRoot, $backendHFCacheDir, $backendTorchCacheDir, $backendSTCacheDir, $backendPipCacheDir)) {
        if (-not (Test-Path -LiteralPath $path)) {
            New-Item -ItemType Directory -Path $path -Force | Out-Null
        }
    }
}

function Load-Env {
    if (!(Test-Path -LiteralPath $envFile)) {
        return
    }
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}

function Ensure-Venv {
    if (-not (Test-Path -LiteralPath $venvPython)) {
        Write-Host "[Setup] Creating backend venv..." -ForegroundColor Yellow
        py -3.12 -m venv (Join-Path $backendDir ".venv")
    }
}

function Install-BackendDeps {
    Write-Host "[Backend] Installing dependencies..." -ForegroundColor Yellow
    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r $requirements
}

function Preload-Models {
    if ($SkipPreload) {
        Write-Host "[Models] Skipping preload (-SkipPreload)." -ForegroundColor Yellow
        return
    }

    if (-not (Test-Path -LiteralPath $preloadScript)) {
        throw "preload_all_models.py not found at $preloadScript"
    }

    Write-Host "[Models] Preloading runtime models..." -ForegroundColor Cyan
    Push-Location $backendDir
    try {
        $env:HF_HOME = $backendHFCacheDir
        $env:TORCH_HOME = $backendTorchCacheDir
        $env:SENTENCE_TRANSFORMERS_HOME = $backendSTCacheDir
        $env:PIP_CACHE_DIR = $backendPipCacheDir

        & $venvPython "scripts/preload_all_models.py"
        if ($LASTEXITCODE -ne 0) {
            throw "Model preload failed (exit code $LASTEXITCODE)."
        }
    }
    finally {
        Pop-Location
    }
}

function Start-Backend {
    Write-Host "[Backend] Starting uvicorn..." -ForegroundColor Cyan

    $shouldReload = -not $NoReload
    if ($BackendMode -match "prod|production") {
        $shouldReload = $false
    }

    $args = @(
        "-m", "uvicorn",
        "app:app",
        "--host", "0.0.0.0",
        "--port", "$portNumber"
    )
    if ($shouldReload) {
        $args += "--reload"
    }

    Push-Location $backendDir
    try {
        $env:PYTHONUNBUFFERED = "1"
        $env:HF_HOME = $backendHFCacheDir
        $env:TORCH_HOME = $backendTorchCacheDir
        $env:SENTENCE_TRANSFORMERS_HOME = $backendSTCacheDir
        $env:PIP_CACHE_DIR = $backendPipCacheDir
        # Ensure models are loaded in app lifespan (overrides SKIP_AI_WARMUP in .env for this launcher).
        $env:SKIP_AI_WARMUP = "0"

        Start-Process -FilePath $venvPython -ArgumentList $args -WorkingDirectory $backendDir -NoNewWindow | Out-Null
    }
    finally {
        Pop-Location
    }
}

function Wait-Backend {
    Write-Host "[Health] Waiting for backend..." -ForegroundColor Yellow
    $timeoutSeconds = 120
    $start = Get-Date

    while ((Get-Date) -lt $start.AddSeconds($timeoutSeconds)) {
        try {
            $res = Invoke-WebRequest "http://127.0.0.1:$portNumber/docs" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($res.StatusCode -eq 200) {
                Write-Host "[Health] Backend is LIVE" -ForegroundColor Green
                return
            }
        }
        catch { }
        Start-Sleep 2
    }

    throw "Backend NOT responding on http://127.0.0.1:$portNumber/docs within ${timeoutSeconds}s"
}

Ensure-Dirs
Load-Env
Ensure-Venv
Install-BackendDeps
Preload-Models
Start-Backend
Wait-Backend
Write-Host "READY - http://127.0.0.1:$portNumber/docs" -ForegroundColor Green

