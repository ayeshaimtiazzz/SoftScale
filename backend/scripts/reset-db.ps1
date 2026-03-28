Param(
    [string]$DbName = "talent_match_db",
    [string]$DbUser = "",
    [string]$ContainerName = "softscale-postgres",
    [string]$BackupPath = ""
)

$ErrorActionPreference = "Stop"

$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot   = Split-Path -Parent $scriptsDir
$backupsDir = Join-Path $repoRoot "database\backups"

if ([string]::IsNullOrWhiteSpace($DbUser)) {
    $envPath = Join-Path (Split-Path -Parent $repoRoot) ".env"
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

Write-Host "Starting database reset for $DbName in container '$ContainerName' (user: $DbUser)..." -ForegroundColor Cyan

function Resolve-BackupPath {
    param([string]$ExplicitPath)

    if (-not [string]::IsNullOrWhiteSpace($ExplicitPath)) {
        if (-not (Test-Path -LiteralPath $ExplicitPath)) {
            Write-Host "Backup file not found: $ExplicitPath" -ForegroundColor Red
            exit 1
        }
        return (Resolve-Path -LiteralPath $ExplicitPath).Path
    }

    $preferred = Join-Path $backupsDir "softscale_backup_20251209_225229.sql"
    if (Test-Path -LiteralPath $preferred) {
        return (Resolve-Path -LiteralPath $preferred).Path
    }

    $latest = Get-ChildItem -Path $backupsDir -Filter "softscale_backup_*.sql" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if ($latest) {
        return $latest.FullName
    }

    Write-Host "No SQL backup found under $backupsDir (expected softscale_backup_*.sql)." -ForegroundColor Red
    exit 1
}

$backupPath = Resolve-BackupPath -ExplicitPath $BackupPath
Write-Host "Using backup: $backupPath" -ForegroundColor Green

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
    param([string]$SourceBackupPath)
    $tmpUtf8 = $null
    $tmpSanitized = $null
    $tmpInContainer = "/tmp/softscale_restore.sql"
    try {
        $tmpUtf8 = Convert-SqlDumpToUtf8NoBom -Path $SourceBackupPath
        $leaf = Split-Path -Leaf $SourceBackupPath
        $utf8 = New-Object System.Text.UTF8Encoding $false

        if ($leaf -ieq "softscale_backup_20251209_225229.sql") {
            docker cp $tmpUtf8 "${ContainerName}:${tmpInContainer}" | Out-Null
        } else {
            $tmpSanitized = Join-Path $env:TEMP ("softscale-restore-sanitized-" + [Guid]::NewGuid().ToString() + ".sql")
            $raw = [System.IO.File]::ReadAllText($tmpUtf8, $utf8)
            $raw = $raw -replace '(?m)^\\restrict .*$','-- \restrict (sanitized for restore)' `
                -replace '(?m)^\\unrestrict .*$','-- \unrestrict (sanitized for restore)'
            $ownerPattern = '(?im)^(\s*ALTER[^\r\n]*OWNER\s+TO\s+)[^;\r\n]+(;)'
            $raw = [regex]::Replace($raw, $ownerPattern, {
                    param($m)
                    $m.Groups[1].Value + $DbUser + $m.Groups[2].Value
                })
            [System.IO.File]::WriteAllText($tmpSanitized, $raw, $utf8)
            docker cp $tmpSanitized "${ContainerName}:${tmpInContainer}" | Out-Null
        }
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

[int]$restoreExit = Invoke-SanitizedRestore -SourceBackupPath $backupPath

if ($restoreExit -ne 0) {
    $legacyFallback = Join-Path $backupsDir "softscale_backup_20251209_225229.sql"
    if ((Split-Path -Leaf $backupPath) -ieq "talent_match_db_2026-03-10.sql" -and (Test-Path -LiteralPath $legacyFallback)) {
        Write-Host "[Restore] Primary backup failed. Retrying with fallback: $legacyFallback" -ForegroundColor Yellow
        docker exec $ContainerName psql -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS $DbName WITH (FORCE);" | Out-Null
        docker exec $ContainerName psql -U $DbUser -d postgres -c "CREATE DATABASE $DbName;" | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[Restore] Failed to recreate DB for fallback restore." -ForegroundColor Red
            exit $LASTEXITCODE
        }
        [int]$restoreExit = Invoke-SanitizedRestore -SourceBackupPath $legacyFallback
        if ($restoreExit -eq 0) {
            $backupPath = $legacyFallback
        }
    }
}

if ($restoreExit -ne 0) {
    Write-Host "psql restore failed (exit $restoreExit)." -ForegroundColor Red
    exit $restoreExit
}

Write-Host "`nDatabase reset and restored from '$backupPath'." -ForegroundColor Cyan
