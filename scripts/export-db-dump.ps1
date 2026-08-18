# Export Docker Postgres (talent_match_db) to backend/database/backups as UTF-8 plain SQL.
Param(
    [string]$DbName = "talent_match_db",
    [string]$ContainerName = "softscale-postgres",
    [string]$OutFile = ""
)

$ErrorActionPreference = "Stop"
$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$backupsDir = Join-Path $repoRoot "backend\database\backups"

if ([string]::IsNullOrWhiteSpace($OutFile)) {
    $stamp = Get-Date -Format "yyyy-MM-dd"
    $OutFile = Join-Path $backupsDir "talent_match_db_$stamp.sql"
}

$DbUser = ""
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
if ([string]::IsNullOrWhiteSpace($DbUser)) { $DbUser = "postgres" }

$tmp = "/tmp/softscale_export_" + [Guid]::NewGuid().ToString("N") + ".sql"

Write-Host "Exporting $DbName from $ContainerName as $DbUser -> $OutFile" -ForegroundColor Cyan

docker exec $ContainerName pg_dump -U $DbUser -d $DbName -F p --encoding=UTF8 --no-owner -c --if-exists -f $tmp
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

New-Item -ItemType Directory -Path (Split-Path -Parent $OutFile) -Force | Out-Null
docker cp "${ContainerName}:$tmp" $OutFile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

docker exec $ContainerName rm -f $tmp 2>$null | Out-Null

$item = Get-Item -LiteralPath $OutFile
Write-Host "Done: $($item.FullName) ($([math]::Round($item.Length / 1MB, 1)) MB)" -ForegroundColor Green
