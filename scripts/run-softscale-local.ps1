Param(
    [switch]$SkipFrontend,
    [switch]$NoReload
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"
$backupPath = Join-Path $repoRoot "backend\database\backups\talent_match_db_2026-04-02.sql"
$backendCacheRoot = Join-Path $backendDir ".cache"
$backendHFCacheDir = Join-Path $backendCacheRoot "huggingface"
$backendTorchCacheDir = Join-Path $backendCacheRoot "torch"
$backendSTCacheDir = Join-Path $backendCacheRoot "sentence_transformers"
$backendPipCacheDir = Join-Path $backendCacheRoot "pip"

Write-Host "Starting SoftScale local runner (repo-local venv/cache paths)..." -ForegroundColor Cyan

if (-not (Test-Path -LiteralPath $backupPath)) {
    throw "Backup not found: $backupPath"
}

if (-not (Test-Path -LiteralPath $venvPython)) {
    throw "Backend venv not found: $venvPython"
}

foreach ($path in @($backendCacheRoot, $backendHFCacheDir, $backendTorchCacheDir, $backendSTCacheDir, $backendPipCacheDir)) {
    if (-not (Test-Path -LiteralPath $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}

Write-Host "`n[Step 1] Preloading backend models locally..." -ForegroundColor Yellow
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
} finally {
    Pop-Location
}

Write-Host "`n[Step 2] Starting backend locally..." -ForegroundColor Yellow
$uvicornCmd = if ($NoReload) {
    "& `"$venvPython`" -m uvicorn app:app --host 0.0.0.0 --port 8000"
} else {
    "& `"$venvPython`" -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload"
}

$backendCommand = @"
`$Host.UI.RawUI.WindowTitle = 'SoftScale - Backend (uvicorn)'
cd `"$backendDir`"
`$env:PYTHONUNBUFFERED = `"1`"
`$env:HF_HOME = `"$backendHFCacheDir`"
`$env:TORCH_HOME = `"$backendTorchCacheDir`"
`$env:SENTENCE_TRANSFORMERS_HOME = `"$backendSTCacheDir`"
`$env:PIP_CACHE_DIR = `"$backendPipCacheDir`"
$uvicornCmd
"@

$be = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand -PassThru
Write-Host "[Backend] Separate window opened (PID: $($be.Id))." -ForegroundColor Green

if (-not $SkipFrontend) {
    Write-Host "`n[Step 3] Starting frontend locally..." -ForegroundColor Yellow
    $frontendCommand = @"
`$Host.UI.RawUI.WindowTitle = 'SoftScale - Frontend (React)'
cd `"$frontendDir`"
npm start
"@
    $fe = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand -PassThru
    Write-Host "[Frontend] Separate window opened (PID: $($fe.Id))." -ForegroundColor Green
} else {
    Write-Host "`n[Step 3] Frontend skipped (-SkipFrontend)." -ForegroundColor Yellow
}

Write-Host "`n[Step 4] Restoring DB in Docker (see scripts\reset-db.ps1)..." -ForegroundColor Yellow
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot "scripts\reset-db.ps1")
if ($LASTEXITCODE -ne 0) {
    throw "Database restore failed (exit code $LASTEXITCODE)."
}

Write-Host "`nDone. Backend/Frontend started locally, database step executed in Docker." -ForegroundColor Cyan
exit 0

