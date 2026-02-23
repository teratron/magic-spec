$designDir = "D:\Projects\src\github.com\teratron\magic-spec\.design"
$planFile = "$designDir\PLAN.md"
$changelogFile = "$designDir\CHANGELOG.md"
$indexFile = "$designDir\INDEX.md"
$contextFile = "$designDir\CONTEXT.md"

if (-not (Test-Path $designDir)) {
    Write-Error "Error: $designDir directory not found"
    exit 1
}

$dateStamp = Get-Date -Format "yyyy-MM-dd"
$bt = [char]96
$codeFence = "$bt$bt$bt"

$activeTech = ""
if (Test-Path $planFile) {
    $activeTech = "Refer to Architecture and Plan for the technology stack. Extracted from PLAN.md."
} else {
    $activeTech = "No PLAN.md found."
}

$structure = ""
try {
    $excludeList = "node_modules", "target", ".git", ".venv", "__pycache__"
    $folders = Get-ChildItem -Directory -Depth 1 | Where-Object { $_.Name -notin $excludeList }
    foreach ($file in $folders) {
        $level = ($file.FullName.Substring((Get-Location).Path.Length) -split '\\').Count - 1
        $indent = "  " * $level
        $structure += "$indent- $($file.Name)/`r`n"
    }
} catch {
    $structure = "- Project root`r`n  - .design/`r`n  - .magic/`r`n"
}

$recentChanges = ""
if (Test-Path $changelogFile) {
    $recentLog = Get-Content $changelogFile -Tail 15 -ErrorAction SilentlyContinue
    if ($recentLog) {
        $recentChanges = $recentLog -join "`r`n"
    } else {
        $recentChanges = "No recent changelog found."
    }
} else {
    $recentChanges = "No recent changelog found."
}

$outputStr = @"
# Project Context

**Generated:** $dateStamp

## Active Technologies

$activeTech

## Core Project Structure

${codeFence}plaintext
$structure${codeFence}

## Recent Changes

$recentChanges
"@

Set-Content -Path $contextFile -Value $outputStr -Encoding UTF8
