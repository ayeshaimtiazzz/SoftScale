Param(
    [switch]$InstallIfMissing
)

$ErrorActionPreference = "Stop"

$scriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptsDir
$frontendDir = Join-Path $repoRoot "frontend"

if (-not (Test-Path -LiteralPath (Join-Path $frontendDir "package.json"))) {
    throw "Frontend package.json not found at $frontendDir"
}

$nodeModulesDir = Join-Path $frontendDir "node_modules"
if ($InstallIfMissing -and -not (Test-Path -LiteralPath $nodeModulesDir)) {
    Write-Host "node_modules missing, running npm install..." -ForegroundColor Yellow
    Push-Location $frontendDir
    try {
        npm install
    } finally {
        Pop-Location
    }
}

Write-Host "Starting frontend locally..." -ForegroundColor Cyan
$frontendCommand = @"
`$Host.UI.RawUI.WindowTitle = 'SoftScale - Frontend (local)'
cd `"$frontendDir`"
npm start
"@

$fe = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand -PassThru
Write-Host "Frontend window started (PID: $($fe.Id)). URL: http://localhost:3000" -ForegroundColor Green

