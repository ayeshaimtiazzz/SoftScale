param(
    [string]$BackendMode = "local",
    [switch]$NoReload
)

$runner = Join-Path $PSScriptRoot "run-softscale-backend-only.ps1"
if (!(Test-Path $runner)) {
    throw "Missing backend runner: $runner"
}

$args = @(
    "-BackendMode", $BackendMode
)
if ($NoReload) {
    $args += "-NoReload"
}

& $runner @args

