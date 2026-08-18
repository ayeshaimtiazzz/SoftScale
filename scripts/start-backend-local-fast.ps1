# Fast local API: no model preload, no lifespan AI warmup — use for dev when you need /docs + DB only.
# Heavy models load on first request (or use start-backend-local-preloaded.ps1).
Param(
    [switch]$NoReload,
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$backendDir = Join-Path $repoRoot "backend"
$venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"

$backendCacheRoot = Join-Path $backendDir ".cache"
$backendHFCacheDir = Join-Path $backendCacheRoot "huggingface"
$backendTorchCacheDir = Join-Path $backendCacheRoot "torch"
$backendSTCacheDir = Join-Path $backendCacheRoot "sentence_transformers"
$backendPipCacheDir = Join-Path $backendCacheRoot "pip"

foreach ($path in @($backendCacheRoot, $backendHFCacheDir, $backendTorchCacheDir, $backendSTCacheDir, $backendPipCacheDir)) {
    if (-not (Test-Path -LiteralPath $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}

if (-not (Test-Path -LiteralPath $venvPython)) {
    throw "Backend venv not found at $venvPython. Create it and pip install -r backend/requirements.txt first."
}

Write-Host "Starting backend (fast: SKIP_AI_WARMUP, proposal model off for quick bind)..." -ForegroundColor Cyan
Write-Host "Ensure Docker DB is up: npm run db:start   (needs DB_HOST/DB_PORT in repo .env)" -ForegroundColor DarkGray

$uvicornCmd = if ($NoReload) {
    "& `"$venvPython`" -m uvicorn app:app --host 0.0.0.0 --port $Port"
} else {
    "& `"$venvPython`" -m uvicorn app:app --host 0.0.0.0 --port $Port --reload"
}

$backendCommand = @"
`$Host.UI.RawUI.WindowTitle = 'SoftScale - Backend (fast)'
cd `"$backendDir`"
`$env:PYTHONUNBUFFERED = `"1`"
`$env:SKIP_AI_WARMUP = `"1`"
`$env:ENABLE_PROPOSAL_MODEL = `"false`"
`$env:DB_CONNECT_TIMEOUT = `"10`"
`$env:HF_HOME = `"$backendHFCacheDir`"
`$env:TORCH_HOME = `"$backendTorchCacheDir`"
`$env:SENTENCE_TRANSFORMERS_HOME = `"$backendSTCacheDir`"
`$env:PIP_CACHE_DIR = `"$backendPipCacheDir`"
$uvicornCmd
"@

$be = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand -PassThru
Write-Host "Backend window PID: $($be.Id)" -ForegroundColor Green
Write-Host "Open http://127.0.0.1:$Port/docs when uvicorn has started (usually a few seconds)." -ForegroundColor Green
