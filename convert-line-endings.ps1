# PowerShell script to convert all text files to LF line endings
# Run this script to fix existing files

Write-Host "Converting all text files to LF line endings..." -ForegroundColor Yellow

# Get all text files (excluding binary files)
$textFiles = Get-ChildItem -Recurse -File | Where-Object {
    $ext = $_.Extension.ToLower()
    $ext -in @('.py', '.js', '.jsx', '.json', '.md', '.yml', '.yaml', '.txt', '.css', '.html', '.sql', '.sh', '.ts', '.tsx', '.vue', '.svelte') -and
    $_.FullName -notmatch 'node_modules|\.git|\.venv|venv|__pycache__|\.next|dist|build'
}

$count = 0
foreach ($file in $textFiles) {
    try {
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
        if ($content -match "`r`n") {
            $content = $content -replace "`r`n", "`n"
            [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.UTF8Encoding]::new($false))
            $count++
            Write-Host "Converted: $($file.FullName)" -ForegroundColor Green
        }
    } catch {
        Write-Host "Error processing $($file.FullName): $_" -ForegroundColor Red
    }
}

Write-Host "`nConversion complete! Converted $count files to LF line endings." -ForegroundColor Cyan
Write-Host "Please review changes with: git diff" -ForegroundColor Yellow
