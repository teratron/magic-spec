param (
    [switch]$json,
    [switch]$require_plan,
    [switch]$require_tasks,
    [switch]$require_specs
)

$indexPath = ".design\INDEX.md"
$rulesPath = ".design\RULES.md"
$planPath = ".design\PLAN.md"
$tasksPath = ".design\tasks\TASKS.md"

$indexExists = Test-Path $indexPath
$rulesExists = Test-Path $rulesPath
$planExists = Test-Path $planPath
$tasksExists = Test-Path $tasksPath

$missing = @()
$warnings = @()

if (-not $indexExists) { $missing += "INDEX.md" }
if (-not $rulesExists) { $missing += "RULES.md" }
if ($require_plan -and -not $planExists) { $missing += "PLAN.md" }
if ($require_tasks -and -not $tasksExists) { $missing += "tasks/TASKS.md" }

$specCount = 0
$stableCount = 0
$draftCount = 0
$rfcCount = 0

if ($indexExists) {
    $lines = Get-Content $indexPath
    $stableCount = ($lines | Where-Object { $_ -match "\|\s*Stable\s*\|" }).Count
    $draftCount = ($lines | Where-Object { $_ -match "\|\s*Draft\s*\|" }).Count
    $rfcCount = ($lines | Where-Object { $_ -match "\|\s*RFC\s*\|" }).Count
    $specCount = $stableCount + $draftCount + $rfcCount
}

if ($require_specs -and $stableCount -eq 0) {
    if ($specCount -eq 0) {
        $missing += "Stable specs (0 specs found)"
    } else {
        $missing += "Stable specs (only Draft/RFC found)"
    }
}

if ($draftCount -gt 0) {
    $warnings += "$draftCount specs are still in Draft status"
}
if ($rfcCount -gt 0) {
    $warnings += "$rfcCount specs are still in RFC status"
}

$ok = $missing.Count -eq 0

if ($json) {
    # Custom structure to exactly match JSON format from specification
    $output = @{
        ok = $ok
        checked_at = (Get-Date -Format "yyyy-MM-dd")
        design_dir = ".design"
        artifacts = @{
            "INDEX.md" = @{ exists = $indexExists; path = ".design/INDEX.md" }
            "RULES.md" = @{ exists = $rulesExists; path = ".design/RULES.md" }
            "PLAN.md"  = @{ exists = $planExists; path = ".design/PLAN.md" }
            "TASKS.md" = @{ exists = $tasksExists; path = ".design/tasks/TASKS.md" }
            "specs"    = @{ count = $specCount; stable = $stableCount; draft = $draftCount }
        }
        missing_required = $missing
        warnings = $warnings
    }
    
    # Needs ConvertTo-Json with deeper depth to avoid clipping nested objects
    $jsonOutput = $output | ConvertTo-Json -Depth 5 -Compress
    
    # The spec required non-compressed, cleanly formatted json
    $jsonOutputFormat = $output | ConvertTo-Json -Depth 5
    Write-Output $jsonOutputFormat
    exit 0
} else {
    if ($ok) {
        exit 0
    } else {
        $missingStr = $missing -join ", "
        Write-Error "Missing required artifacts: $missingStr"
        exit 1
    }
}
