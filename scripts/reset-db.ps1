Param(
    [string]$DbName = "talent_match_db",
    [string]$DbUser = "",
    [string]$ContainerName = "softscale-postgres"
)

$ErrorActionPreference = "Stop"

$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot   = Split-Path -Parent $scriptsDir
$backupsDir = Join-Path $repoRoot "backend\database\backups"
$sqlPath    = Join-Path $backupsDir "talent_match_db_2026-04-13_015445.sql"

if ([string]::IsNullOrWhiteSpace($DbUser)) {
    $envPath = Join-Path $repoRoot ".env"
    if (Test-Path $envPath) {
        foreach ($key in @("POSTGRES_USER", "DB_USER")) {
            $line = Select-String -Path $envPath -Pattern ("^" + [Regex]::Escape($key) + "=") | Select-Object -First 1
            if ($line) {
                $DbUser = $line.Line.Substring($key.Length + 1).Trim()
                if (-not [string]::IsNullOrWhiteSpace($DbUser)) { break }
            }
        }
    }
}
if ([string]::IsNullOrWhiteSpace($DbUser)) {
    $DbUser = "postgres"
}

if (-not (Test-Path -LiteralPath $sqlPath)) {
    Write-Host "SQL dump not found: $sqlPath" -ForegroundColor Red
    exit 1
}
$sqlPath = (Resolve-Path -LiteralPath $sqlPath).Path

Write-Host "Starting database reset for $DbName in container '$ContainerName' (user: $DbUser)..." -ForegroundColor Cyan
Write-Host "Using dump: $sqlPath" -ForegroundColor Green

Write-Host "`n[Step 1] Ensure Postgres container is running (starting via docker compose)..." -ForegroundColor Yellow
try {
    Push-Location $repoRoot
    try {
        docker compose up -d postgres
    } catch {
        Write-Host "'docker compose' failed, trying 'docker-compose'..." -ForegroundColor Yellow
        docker-compose up -d postgres
    }
    Pop-Location
} catch {
    Write-Host "Failed to start Postgres via Docker. Is Docker Desktop running?" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 5

Write-Host "`n[Step 2] Drop and recreate database '$DbName'..." -ForegroundColor Yellow
docker exec $ContainerName psql -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS $DbName WITH (FORCE);" | Out-Null
docker exec $ContainerName psql -U $DbUser -d postgres -c "CREATE DATABASE $DbName;" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to recreate database $DbName." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "`n[Step 3] Restore database (docker cp + psql -f avoids Windows COPY/CRLF issues)..." -ForegroundColor Yellow

# pg_dump sometimes emits UTF-16 LE; psql COPY parsing expects UTF-8. Normalize first so tab-separated data stays aligned.
function Convert-SqlDumpToUtf8NoBom {
    param([string]$Path)
    $out = Join-Path $env:TEMP ("softscale-utf8-" + [Guid]::NewGuid().ToString() + ".sql")
    $sr = New-Object System.IO.StreamReader($Path, $true)
    try {
        $text = $sr.ReadToEnd()
    } finally {
        $sr.Close()
    }
    $enc = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($out, $text, $enc)
    return $out
}

function Invoke-SanitizedRestore {
    param([string]$SourceSqlPath)
    $tmpUtf8 = $null
    $tmpSanitized = $null
    $tmpInContainer = "/tmp/softscale_restore.sql"
    try {
        $tmpUtf8 = Convert-SqlDumpToUtf8NoBom -Path $SourceSqlPath
        $utf8 = New-Object System.Text.UTF8Encoding $false
        $tmpSanitized = Join-Path $env:TEMP ("softscale-restore-sanitized-" + [Guid]::NewGuid().ToString() + ".sql")
        $raw = [System.IO.File]::ReadAllText($tmpUtf8, $utf8)
        # Only rewrite OWNER TO on DDL lines (ALTER ... OWNER TO role;). Matching \bOWNER\s+TO\b
        # elsewhere also hits phrases like "Owner to review..." inside COPY rows and corrupts data.
        $raw = $raw -replace '(?m)^\\restrict .*$','-- \restrict (sanitized for restore)' `
            -replace '(?m)^\\unrestrict .*$','-- \unrestrict (sanitized for restore)'
        $ownerPattern = '(?im)^(\s*ALTER[^\r\n]*OWNER\s+TO\s+)[^;\r\n]+(;)'
        $raw = [regex]::Replace($raw, $ownerPattern, {
                param($m)
                $m.Groups[1].Value + $DbUser + $m.Groups[2].Value
            })
        [System.IO.File]::WriteAllText($tmpSanitized, $raw, $utf8)
        docker cp $tmpSanitized "${ContainerName}:${tmpInContainer}" | Out-Null
        if ($LASTEXITCODE -ne 0) {
            return [int]$LASTEXITCODE
        }

        docker exec $ContainerName psql -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -f $tmpInContainer | Out-Null
        return [int]$LASTEXITCODE
    } finally {
        docker exec $ContainerName rm -f $tmpInContainer 2>$null | Out-Null
        if ($tmpSanitized) {
            Remove-Item -LiteralPath $tmpSanitized -ErrorAction SilentlyContinue
        }
        if ($tmpUtf8) {
            Remove-Item -LiteralPath $tmpUtf8 -ErrorAction SilentlyContinue
        }
    }
}

[int]$restoreExit = Invoke-SanitizedRestore -SourceSqlPath $sqlPath

if ($restoreExit -ne 0) {
    Write-Host "psql restore failed (exit $restoreExit)." -ForegroundColor Red
    exit $restoreExit
}

Write-Host "`nDatabase reset and restored from '$sqlPath'." -ForegroundColor Cyan
