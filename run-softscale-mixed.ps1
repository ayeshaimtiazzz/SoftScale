param(
    [ValidateSet("docker", "local")]
    [string]$BackendMode = "docker",

    [switch]$SkipFrontend,
    [switch]$SkipBackendBuild,
    [switch]$NoReload,
    [switch]$SkipDbRestore
)

$ErrorActionPreference = "Stop"
# PS7+: stderr from docker/psql must not fail the script when ErrorAction is Stop
if ($PSVersionTable.PSVersion.Major -ge 7) {
    $PSNativeCommandUseErrorActionPreference = $false
}

Write-Host "Starting SoftScale mixed runner..." -ForegroundColor Cyan

$repoRoot    = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir  = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$cacheDir    = Join-Path $repoRoot ".cache"
$backendCacheRoot = Join-Path $backendDir ".cache"
$backendHFCacheDir = Join-Path $backendCacheRoot "huggingface"
$backendTorchCacheDir = Join-Path $backendCacheRoot "torch"
$backendSTCacheDir = Join-Path $backendCacheRoot "sentence_transformers"
$backendPipCacheDir = Join-Path $backendCacheRoot "pip"
$intentModelDir = Join-Path $backendDir "ai\sentiment_analysis\model\intent_model\distilbert"
$embedModelCacheDir = Join-Path $backendCacheRoot "sentence_transformers\models--sentence-transformers--all-MiniLM-L6-v2"

# Force repo-local caches for any local Python/pip/model operations.
$env:HF_HOME = $backendHFCacheDir
$env:TORCH_HOME = $backendTorchCacheDir
$env:SENTENCE_TRANSFORMERS_HOME = $backendSTCacheDir
$env:PIP_CACHE_DIR = $backendPipCacheDir

function Ensure-Postgres-Docker {
    Write-Host "`n[Database] Starting Postgres in Docker..." -ForegroundColor Yellow
    Push-Location $repoRoot
    try {
        docker compose up -d postgres
    } catch {
        Write-Host "[Database] 'docker compose' failed, trying 'docker-compose'..." -ForegroundColor Yellow
        docker-compose up -d postgres
    } finally {
        Pop-Location
    }
}

# Run SQL via docker cp + psql -f (same pattern as scripts/reset-db.ps1). Start-Process -ArgumentList with psql -c
# breaks on Windows PowerShell 5.1: the SQL is split into separate argv tokens after -c.
function Invoke-DockerPsqlFromFile {
    param(
        [string]$ContainerName,
        [string]$DbUser,
        [string]$DbName,
        [string]$Sql
    )
    $winTmp = Join-Path $env:TEMP ("softscale-psql-" + [Guid]::NewGuid().ToString() + ".sql")
    $inContainer = "/tmp/softscale_psql_" + [Guid]::NewGuid().ToString("N").Substring(0, 12) + ".sql"
    $outFile = Join-Path $env:TEMP ("softscale-dx-out-" + [Guid]::NewGuid().ToString() + ".txt")
    $errFile = Join-Path $env:TEMP ("softscale-dx-err-" + [Guid]::NewGuid().ToString() + ".txt")
    try {
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($winTmp, $Sql, $utf8NoBom)
        docker cp $winTmp "${ContainerName}:${inContainer}"
        if ($LASTEXITCODE -ne 0) {
            return @{ ExitCode = $LASTEXITCODE; Text = "docker cp failed" }
        }
        $p = Start-Process -FilePath "docker" -ArgumentList @('exec', $ContainerName, 'psql', '-U', $DbUser, '-d', $DbName, '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-f', $inContainer) -NoNewWindow -Wait -PassThru -RedirectStandardOutput $outFile -RedirectStandardError $errFile
        $stdout = if (Test-Path -LiteralPath $outFile) { $c = Get-Content -LiteralPath $outFile -Raw; if ($null -eq $c) { "" } else { $c } } else { "" }
        $stderr = if (Test-Path -LiteralPath $errFile) { $c = Get-Content -LiteralPath $errFile -Raw; if ($null -eq $c) { "" } else { $c } } else { "" }
        $merged = $stdout.Trim()
        if ($stderr.Trim()) {
            if ($merged) { $merged = $merged + "`n" + $stderr.Trim() } else { $merged = $stderr.Trim() }
        }
        return @{ ExitCode = $p.ExitCode; Text = $merged.Trim() }
    } finally {
        Remove-Item -LiteralPath $winTmp -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $outFile -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $errFile -ErrorAction SilentlyContinue
        docker exec $ContainerName rm -f $inContainer 2>$null | Out-Null
    }
}

function Test-DatabaseHasUserData {
    param(
        [string]$ContainerName = "softscale-postgres",
        [string]$DbUser = "postgres",
        [string]$DbName = "talent_match_db",
        [int]$MaxRetries = 20,
        [int]$SleepSeconds = 2
    )

    for ($i = 0; $i -lt $MaxRetries; $i++) {
        $null = docker exec $ContainerName pg_isready -U $DbUser 2>&1
        if ($LASTEXITCODE -eq 0) { break }
        Start-Sleep -Seconds $SleepSeconds
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[Database] Postgres not ready yet; treating as empty (will restore)." -ForegroundColor Yellow
        return $false
    }

    $existsSql = "SELECT 1 FROM pg_database WHERE datname = '$DbName';"
    $dbRes = Invoke-DockerPsqlFromFile -ContainerName $ContainerName -DbUser $DbUser -DbName "postgres" -Sql $existsSql
    $dbExit = $dbRes.ExitCode
    $dbRow = $dbRes.Text
    if ($dbExit -ne 0) {
        return $false
    }
    if ([string]::IsNullOrWhiteSpace($dbRow) -or $dbRow.Trim() -ne "1") {
        return $false
    }

    # Two-step check: a single CASE/EXISTS SQL can still plan/execute the COUNT branch and error if
    # "users" is missing; query information_schema first, then COUNT only when the table exists.
    $tableProbeSql = "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1;"
    $probeRes = Invoke-DockerPsqlFromFile -ContainerName $ContainerName -DbUser $DbUser -DbName $DbName -Sql $tableProbeSql
    if ($probeRes.ExitCode -ne 0) {
        return $false
    }
    if ([string]::IsNullOrWhiteSpace($probeRes.Text) -or $probeRes.Text.Trim() -ne "1") {
        return $false
    }

    $countSql = "SELECT COUNT(*)::bigint FROM public.users;"
    $countRes = Invoke-DockerPsqlFromFile -ContainerName $ContainerName -DbUser $DbUser -DbName $DbName -Sql $countSql
    $countExit = $countRes.ExitCode
    $countOut = $countRes.Text
    if ($countExit -ne 0) {
        return $false
    }
    $parsed = 0
    if (-not [int]::TryParse($countOut.Trim(), [ref]$parsed)) {
        return $false
    }
    return ($parsed -gt 0)
}

function Invoke-DatabaseRestoreFromBackup {
    $resetScript = Join-Path $repoRoot "scripts\reset-db.ps1"
    if (-not (Test-Path $resetScript)) {
        throw "Database restore script not found: $resetScript"
    }
    $dbUser = Get-DockerPostgresUser
    Write-Host "`n[Database] Running restore as role '$dbUser' (drops/recreates DB; see scripts\reset-db.ps1)..." -ForegroundColor Yellow
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $resetScript -DbUser $dbUser
    if ($LASTEXITCODE -ne 0) {
        throw "Database restore failed (exit code $LASTEXITCODE)."
    }
    Write-Host "[Database] Restore completed." -ForegroundColor Green
}

function Wait-For-Port {
    param(
        # Must not be named "Host" — that collides with PowerShell's automatic $Host variable.
        [Parameter(Mandatory = $true)][string]$ComputerName,
        [Parameter(Mandatory = $true)][int]$Port,
        [int]$TimeoutSeconds = 120,
        [int]$SleepSeconds = 2
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            # TcpClient is much faster than Test-NetConnection (which can stall 10–20s per attempt).
            $tcp = New-Object System.Net.Sockets.TcpClient
            $iar = $tcp.BeginConnect($ComputerName, $Port, $null, $null)
            if ($iar.AsyncWaitHandle.WaitOne(800)) {
                try {
                    $tcp.EndConnect($iar)
                    Write-Host "[Wait] ${ComputerName}:$Port is reachable." -ForegroundColor Green
                    return
                } finally {
                    $tcp.Close()
                }
            } else {
                $tcp.Close()
            }
        } catch {
            # ignore transient networking errors
        }
        Start-Sleep -Seconds $SleepSeconds
    }

    throw "Timeout waiting for ${ComputerName}:$Port to be reachable."
}

function Wait-For-Backend-Or-Warn {
    param(
        [string]$ComputerName = "127.0.0.1",
        [int]$Port = 8000
    )
    try {
        # Give backend more time on first run/model warm start.
        Wait-For-Port -ComputerName $ComputerName -Port $Port -TimeoutSeconds 300
    } catch {
        Write-Host "[Backend] Warning: Backend did not become reachable in time." -ForegroundColor Yellow
        Write-Host "[Backend] Continuing so frontend still starts. Check backend window logs." -ForegroundColor Yellow
    }
}

function Get-Env-Value {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string]$Key
    )

    if (-not (Test-Path $FilePath)) { return $null }

    # Simple parser for KEY=VALUE lines.
    $line = Select-String -Path $FilePath -Pattern ("^" + [Regex]::Escape($Key) + "=") -SimpleMatch:$false | Select-Object -First 1
    if (-not $line) { return $null }

    return ($line.Line.Substring($Key.Length + 1).Trim())
}

function Get-DockerPostgresUser {
    $envPath = Join-Path $repoRoot ".env"
    foreach ($key in @("POSTGRES_USER", "DB_USER")) {
        $v = Get-Env-Value -FilePath $envPath -Key $key
        if (-not [string]::IsNullOrWhiteSpace($v)) {
            return $v.Trim()
        }
    }
    return "postgres"
}

function Get-FileHashSafe {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $null }
    return (Get-FileHash -Path $Path -Algorithm SHA256).Hash
}

function Ensure-CacheDir {
    if (-not (Test-Path $cacheDir)) {
        New-Item -Path $cacheDir -ItemType Directory | Out-Null
    }
}

function Ensure-Backend-CacheDirs {
    $paths = @(
        $backendCacheRoot,
        $backendHFCacheDir,
        $backendTorchCacheDir,
        $backendSTCacheDir,
        $backendPipCacheDir
    )

    foreach ($path in $paths) {
        if (-not (Test-Path $path)) {
            New-Item -Path $path -ItemType Directory -Force | Out-Null
        }
    }
}

function Ensure-Local-Models {
    Write-Host "`n[Models] Verifying local model files..." -ForegroundColor Yellow

    $intentConfig = Join-Path $intentModelDir "config.json"
    $intentTokenizer = Join-Path $intentModelDir "tokenizer.json"
    if (-not ((Test-Path $intentConfig) -and (Test-Path $intentTokenizer))) {
        throw "[Models] Intent model is missing/incomplete at $intentModelDir. Restore local model files before running."
    }
    Write-Host "[Models] Intent model found at $intentModelDir" -ForegroundColor Green

    if (-not (Test-Path $embedModelCacheDir)) {
        throw "[Models] Embedding model cache not found at $embedModelCacheDir. Runner is offline and will not download from Hugging Face."
    }
    Write-Host "[Models] Embedding model cache found at $embedModelCacheDir" -ForegroundColor Green
}

function Ensure-Frontend-Env {
    if ($SkipFrontend) { return }

    $frontendEnvPath = Join-Path $frontendDir ".env"
    if (Test-Path $frontendEnvPath) {
        Write-Host "[Frontend] $frontendEnvPath already exists; leaving it as-is." -ForegroundColor Green
        return
    }

    $rootEnvPath = Join-Path $repoRoot ".env"
    $apiBase = Get-Env-Value -FilePath $rootEnvPath -Key "REACT_APP_API_BASE"
    if (-not $apiBase) {
        $apiBase = "http://127.0.0.1:8000/api"
    }

    Write-Host "[Frontend] Creating $frontendEnvPath (REACT_APP_API_BASE=...)." -ForegroundColor Yellow
    @"
REACT_APP_API_BASE=$apiBase
"@ | Out-File -Encoding UTF8 -FilePath $frontendEnvPath
}

function Ensure-Frontend-Deps {
    if ($SkipFrontend) { return }

    Write-Host "`n[Frontend] Checking Node dependencies..." -ForegroundColor Yellow
    $nodeModulesPath   = Join-Path $frontendDir "node_modules"
    $packageLockPath   = Join-Path $frontendDir "package-lock.json"
    $frontendStampPath = Join-Path $cacheDir "frontend-deps.sha256"
    $currentHash       = Get-FileHashSafe -Path $packageLockPath
    $savedHash         = $null
    if (Test-Path $frontendStampPath) {
        $savedHash = (Get-Content $frontendStampPath -Raw).Trim()
    }

    if ((Test-Path $nodeModulesPath) -and $currentHash -and ($currentHash -eq $savedHash)) {
        Write-Host "[Frontend] Dependencies unchanged; skipping npm install." -ForegroundColor Green
        return
    }

    Write-Host "[Frontend] Running npm install..." -ForegroundColor Yellow
    Push-Location $frontendDir
    try {
        npm install
        Ensure-CacheDir
        if ($currentHash) {
            Set-Content -Path $frontendStampPath -Value $currentHash -Encoding UTF8
        }
    } finally {
        Pop-Location
    }
}

function Ensure-Backend-Venv-And-Deps {
    # Used only for BackendMode=local.
    Write-Host "`n[Backend] Ensuring local Python venv + deps..." -ForegroundColor Yellow
    $venvPath = Join-Path $backendDir ".venv"
    $venvPython = Join-Path $venvPath "Scripts\python.exe"

    if (-not (Test-Path $venvPython)) {
        Write-Host "[Backend] Creating venv at $venvPath" -ForegroundColor Green
        Push-Location $backendDir
        try {
            py -3.12 -m venv .venv
        } finally {
            Pop-Location
        }
    }

    if (-not (Test-Path $venvPython)) {
        throw "Backend venv python not found at $venvPython"
    }

    $requirementsPath   = Join-Path $backendDir "requirements.txt"
    $backendStampPath   = Join-Path $cacheDir "backend-deps.sha256"
    $venvCreated        = -not (Test-Path (Join-Path $venvPath ".installed-stamp"))
    $currentReqHash     = Get-FileHashSafe -Path $requirementsPath
    $savedReqHash       = $null
    if (Test-Path $backendStampPath) {
        $savedReqHash = (Get-Content $backendStampPath -Raw).Trim()
    }

    if ((-not $venvCreated) -and $currentReqHash -and ($currentReqHash -eq $savedReqHash)) {
        Write-Host "[Backend] requirements.txt unchanged; skipping pip install." -ForegroundColor Green
        return
    }

    Push-Location $backendDir
    try {
        & $venvPython -m pip install --upgrade pip
        & $venvPython -m pip install -r requirements.txt
        Ensure-CacheDir
        if ($currentReqHash) {
            Set-Content -Path $backendStampPath -Value $currentReqHash -Encoding UTF8
        }
        Set-Content -Path (Join-Path $venvPath ".installed-stamp") -Value "ok" -Encoding UTF8
    } finally {
        Pop-Location
    }
}

function Preload-Backend-Models {
    Write-Host "`n[Models] Preloading/checking runtime models..." -ForegroundColor Yellow
    $venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"
    if (-not (Test-Path $venvPython)) {
        throw "[Models] Backend venv python not found at $venvPython"
    }

    Push-Location $backendDir
    try {
        $env:HF_HOME = $backendHFCacheDir
        $env:TORCH_HOME = $backendTorchCacheDir
        $env:SENTENCE_TRANSFORMERS_HOME = $backendSTCacheDir
        $env:PIP_CACHE_DIR = $backendPipCacheDir
        & $venvPython "scripts/preload_all_models.py"
    } finally {
        Pop-Location
    }
}

function Preload-Backend-Models-Docker {
    Write-Host "`n[Models] Preloading/checking runtime models in backend container..." -ForegroundColor Yellow
    Push-Location $repoRoot
    try {
        docker exec softscale-backend python scripts/preload_all_models.py
        if ($LASTEXITCODE -ne 0) {
            throw "[Models] Docker preload failed with exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
}

function Start-Backend-Local {
    if ($NoReload) {
        Write-Host "`n[Backend] Starting backend locally (uvicorn, no reload)..." -ForegroundColor Yellow
    } else {
        Write-Host "`n[Backend] Starting backend locally (uvicorn --reload)..." -ForegroundColor Yellow
    }

    $uvicornCmd = if ($NoReload) {
        "& `"$backendDir\.venv\Scripts\python.exe`" -m uvicorn app:app --host 0.0.0.0 --port 8000"
    } else {
        "& `"$backendDir\.venv\Scripts\python.exe`" -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload"
    }

    $backendCommand = @"
`$Host.UI.RawUI.WindowTitle = 'SoftScale - Backend (uvicorn)'
cd `"$backendDir`"
`$env:PYTHONUNBUFFERED = `"1`"
`$env:HF_HOME = `"$backendHFCacheDir`"
`$env:TORCH_HOME = `"$backendTorchCacheDir`"
`$env:SENTENCE_TRANSFORMERS_HOME = `"$backendSTCacheDir`"
`$env:PIP_CACHE_DIR = `"$backendPipCacheDir`"

if (-not (Test-Path ".env")) {
    Write-Host "Creating default backend .env..." -ForegroundColor Yellow
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

Write-Host '[Backend] API: http://127.0.0.1:8000/docs - logs continue below; model load may print after this' -ForegroundColor Cyan
$uvicornCmd
"@

    $be = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand -PassThru
    Write-Host "[Backend] Separate window opened (PID: $($be.Id))." -ForegroundColor Green
}

function Start-Backend-Docker {
    Write-Host "`n[Backend] Starting backend in Docker (docker-compose)... " -ForegroundColor Yellow
    Push-Location $repoRoot
    try {
        if (-not $SkipBackendBuild) {
            try {
                docker compose build backend
            } catch {
                docker-compose build backend
            }
        }

        try {
            docker compose up -d backend
        } catch {
            docker-compose up -d backend
        }
    } finally {
        Pop-Location
    }
}

function Start-Frontend-Window {
    if ($SkipFrontend) { return }

    Write-Host "`n[Frontend] Opening separate PowerShell window for `npm start`..." -ForegroundColor Yellow
    if (-not (Test-Path $frontendDir)) {
        Write-Host "[Frontend] Frontend directory not found: $frontendDir" -ForegroundColor Red
        return
    }
    if (-not (Test-Path (Join-Path $frontendDir "package.json"))) {
        Write-Host "[Frontend] package.json not found in: $frontendDir" -ForegroundColor Red
        return
    }

    $frontendDirEscaped = $frontendDir -replace "'", "''"
    $frontendCommand = "`$Host.UI.RawUI.WindowTitle = 'SoftScale - Frontend (React)'; Set-Location -LiteralPath '$frontendDirEscaped'; npm start"
    $process = Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand `
        -PassThru

    Write-Host "[Frontend] Separate window opened (PID: $($process.Id))." -ForegroundColor Green
}

function Start-Backend-And-Frontend-Windows {
    Write-Host "`n[Run] Starting backend and frontend in two separate windows..." -ForegroundColor Cyan
    if ($BackendMode -eq "local") {
        Start-Backend-Local
    }
    if (-not $SkipFrontend) {
        Start-Frontend-Window
    } elseif ($BackendMode -eq "local") {
        Write-Host "[Run] Frontend skipped (-SkipFrontend)." -ForegroundColor Yellow
    }
}

Write-Host "`nStep 1: Preparing local cache directories..." -ForegroundColor Cyan
Ensure-Backend-CacheDirs

Write-Host "`nStep 2: Verifying local model files..." -ForegroundColor Cyan
Ensure-Local-Models

Write-Host "`nStep 3: Starting database in Docker..." -ForegroundColor Cyan
Ensure-Postgres-Docker

if (-not $SkipDbRestore) {
    Write-Host "`nStep 4: Database backup (only if DB is empty or missing)..." -ForegroundColor Cyan
    $dockerPgUser = Get-DockerPostgresUser
    Write-Host "[Database] Using Postgres role '$dockerPgUser' (from .env POSTGRES_USER / DB_USER, else postgres)." -ForegroundColor DarkGray
    if (Test-DatabaseHasUserData -DbUser $dockerPgUser) {
        Write-Host "[Database] talent_match_db already contains data (users > 0). Skipping dump restore." -ForegroundColor Green
    } else {
        Write-Host "[Database] No existing user data (or DB not initialized). Applying SQL dump..." -ForegroundColor Yellow
        Invoke-DatabaseRestoreFromBackup
    }
} else {
    Write-Host "`nStep 4: Skipping DB check/restore (-SkipDbRestore)." -ForegroundColor Yellow
}

if ($BackendMode -eq "docker") {
    Write-Host "`nStep 5: Starting backend in Docker..." -ForegroundColor Cyan
    Start-Backend-Docker
    Write-Host "`nStep 6: Preloading/checking backend models in Docker..." -ForegroundColor Cyan
    Preload-Backend-Models-Docker
} else {
    Write-Host "`nStep 5: Preparing local backend environment..." -ForegroundColor Cyan
    Ensure-Backend-Venv-And-Deps

    Write-Host "`nStep 6: Preloading/checking backend models..." -ForegroundColor Cyan
    Preload-Backend-Models
}

Write-Host "`nStep 7: Frontend env + npm dependencies..." -ForegroundColor Cyan
Ensure-Frontend-Env
Ensure-Frontend-Deps

Write-Host "`nStep 8: Backend + frontend together (two separate windows)..." -ForegroundColor Cyan
if ($BackendMode -eq "docker") {
    if (-not $SkipFrontend) {
        Start-Frontend-Window
    }
} else {
    Start-Backend-And-Frontend-Windows
}

Write-Host "`nStep 9: Waiting for backend on :8000 (optional)..." -ForegroundColor Cyan
Wait-For-Backend-Or-Warn -ComputerName "127.0.0.1" -Port 8000

Write-Host "`nAll done. Backend window + frontend window should be open. API: http://127.0.0.1:8000/docs  Frontend: http://localhost:3000" -ForegroundColor Cyan

