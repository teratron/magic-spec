$designDir = ".design"
$changelogFile = "$designDir\CHANGELOG.md"
$contextFile = "$designDir\CONTEXT.md"

if (-not (Test-Path $designDir)) {
    Write-Error "Error: $designDir directory not found"
    exit 1
}

$dateStamp = Get-Date -Format "yyyy-MM-dd"
$bt = [char]96
$codeFence = "$bt$bt$bt"

$isNode   = Test-Path "package.json"
$isPython = (Test-Path "pyproject.toml") -or (Test-Path "requirements.txt")
$isRust   = Test-Path "Cargo.toml"
$isGo     = Test-Path "go.mod"
$isMake   = Test-Path "Makefile"

$techList = @()
if ($isNode)   { $techList += "- Node.js" }
if ($isPython) { $techList += "- Python (uv/poetry/hatch)" }
if ($isRust)   { $techList += "- Rust" }
if ($isGo)     { $techList += "- Go" }
if ($isMake)   { $techList += "- Make" }

$activeTech = if ($techList.Count -eq 0) { "- Unknown (no manifest detected)" } else { $techList -join "`r`n" }

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
    $recentChanges = if ($recentLog) { $recentLog -join "`r`n" } else { "No recent changelog found." }
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
