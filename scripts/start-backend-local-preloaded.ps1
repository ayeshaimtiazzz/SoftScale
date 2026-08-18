Param(
    [switch]$NoReload,
    [int]$Port = 8000,
    [switch]$SkipPreload,
    # By default do not block npm/terminal for minutes waiting on port 8000 — use -WaitForPort to wait.
    [switch]$WaitForPort
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
    throw "Backend venv not found at $venvPython. Create it first (for example via run-softscale-mixed.ps1 -BackendMode local)."
}

if (-not $SkipPreload) {
    Write-Host "[1/3] Preloading backend models..." -ForegroundColor Cyan
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
} else {
    Write-Host "[1/3] Skipping model preload (-SkipPreload)." -ForegroundColor Yellow
}

Write-Host "[2/3] Launching backend locally..." -ForegroundColor Cyan
$uvicornCmd = if ($NoReload) {
    "& `"$venvPython`" -m uvicorn app:app --host 0.0.0.0 --port $Port"
} else {
    "& `"$venvPython`" -m uvicorn app:app --host 0.0.0.0 --port $Port --reload"
}

$backendCommand = @"
`$Host.UI.RawUI.WindowTitle = 'SoftScale - Backend (local preloaded)'
cd `"$backendDir`"
`$env:PYTHONUNBUFFERED = `"1`"
`$env:HF_HOME = `"$backendHFCacheDir`"
`$env:TORCH_HOME = `"$backendTorchCacheDir`"
`$env:SENTENCE_TRANSFORMERS_HOME = `"$backendSTCacheDir`"
`$env:PIP_CACHE_DIR = `"$backendPipCacheDir`"
`$env:DB_CONNECT_TIMEOUT = `"10`"
`$env:SKIP_AI_WARMUP = `"0`"
$uvicornCmd
"@

$be = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand -PassThru

if ($WaitForPort) {
    Write-Host "[3/3] Waiting for backend on 127.0.0.1:$Port (up to 90s)..." -ForegroundColor Cyan
    $deadline = (Get-Date).AddSeconds(90)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $iar = $tcp.BeginConnect("127.0.0.1", $Port, $null, $null)
            if ($iar.AsyncWaitHandle.WaitOne(800)) {
                try {
                    $tcp.EndConnect($iar)
                    $ready = $true
                    break
                } finally {
                    $tcp.Close()
                }
            } else {
                $tcp.Close()
            }
        } catch {
            # ignore transient readiness errors
        }
        Start-Sleep -Seconds 1
    }

    if ($ready) {
        Write-Host "Backend reachable: http://127.0.0.1:$Port/docs" -ForegroundColor Green
    } else {
        Write-Host "Port $Port not open yet - check the backend PowerShell window for errors." -ForegroundColor Yellow
    }
} else {
    Write-Host "[3/3] Not waiting on port (use -WaitForPort to poll). Backend window PID: $($be.Id)" -ForegroundColor Cyan
}
Write-Host "http://127.0.0.1:$Port/docs" -ForegroundColor Green

