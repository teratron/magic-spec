param (
    [switch]$json,
    [switch]$require_plan,
    [switch]$require_tasks,
    [switch]$require_specs
)

$indexPath = ".design\INDEX.md"
$rulesPath = ".design\RULES.md"
$planPath = ".design\PLAN.md"
$tasksPath = ".design\TASKS.md"

$indexExists = Test-Path $indexPath
$rulesExists = Test-Path $rulesPath
$planExists = Test-Path $planPath
$tasksExists = Test-Path $tasksPath
# Write-Host "DEBUG: CWD is $(Get-Location)"
$checksumsExists = Test-Path ".magic\.checksums"

$missing = @()
$warnings = @()

# Engine Integrity Check (Internal logic check)
if ($checksumsExists) {
    try {
        # Use CWD and Join-Path for reliability
        $root = (Get-Item ".").FullName
        $checksumsPath = Join-Path $root ".magic\.checksums"
        $magicDir = Join-Path $root ".magic"
        
        $checksums = Get-Content $checksumsPath -Raw | ConvertFrom-Json
        
        foreach ($prop in $checksums.PSObject.Properties) {
            $relPath = $prop.Name
            # Skip the checksums file itself
            if ($relPath -eq ".checksums") { continue }
            
            $storedHash = $prop.Value
            $fullPath = Join-Path $magicDir ($relPath.Replace('/', '\'))
            if (Test-Path $fullPath -PathType Leaf) {
                # Use .NET for hash calculation to be more robust across environments
                $stream = [System.IO.File]::OpenRead($fullPath)
                $sha256 = [System.Security.Cryptography.SHA256]::Create()
                $hash = [System.BitConverter]::ToString($sha256.ComputeHash($stream)).Replace("-", "").ToLower()
                $stream.Close()
                
                if ($hash -ne $storedHash) {
                    $warnings += "Engine Integrity: '.magic/$relPath' has been modified locally. Run 'node .magic/scripts/executor.js generate-checksums' if this was intentional."
                }
            }
        }
    } catch {
        $warnings += "Engine Integrity: '.magic/.checksums' check failed ($($_.Exception.Message))."
    }
} else {
    $warnings += "Engine Integrity: '.magic/.checksums' is missing."
}

if (-not $indexExists) { $missing += "INDEX.md" }
if (-not $rulesExists) { $missing += "RULES.md" }
if ($require_plan -and -not $planExists) { $missing += "PLAN.md" }
if ($require_tasks -and -not $tasksExists) { $missing += "TASKS.md" }

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
    
    if ($planExists) {
        # Extract spec filenames from INDEX.md (lines matching "| [file.md](specifications/file.md) |")
        $indexSpecs = $lines | Where-Object { $_ -match "\|\s*\[.*?\]\(specifications/(.*?\.md)\)" } | ForEach-Object { 
            if ($_ -match "specifications/(.*?\.md)") { $Matches[1] }
        }
        
        # Check if each spec is mentioned in PLAN.md
        $planContent = Get-Content $planPath -Raw
        foreach ($spec in $indexSpecs) {
            # Use fixed-string matching instead of regex to avoid path character issues
            if ($planContent -notlike "*$spec*") {
                $warnings += "Orphaned specification: '$spec' is in INDEX.md but missing from PLAN.md"
            }
        }
    }
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
    $output = @{
        ok = $ok
        checked_at = (Get-Date -Format "yyyy-MM-dd")
        design_dir = ".design"
        artifacts = @{
            "INDEX.md" = @{ exists = $indexExists; path = ".design/INDEX.md" }
            "RULES.md" = @{ exists = $rulesExists; path = ".design/RULES.md" }
            "PLAN.md"  = @{ exists = $planExists; path = ".design/PLAN.md" }
            "TASKS.md" = @{ exists = $tasksExists; path = ".design/TASKS.md" }
            "specs"    = @{ count = $specCount; stable = $stableCount; draft = $draftCount }
        }
        missing_required = $missing
        warnings = $warnings
    }
    
    $jsonOutputFormat = $output | ConvertTo-Json -Depth 5
    Write-Output $jsonOutputFormat
    exit 0
} else {
    if ($ok) {
        if ($warnings.Count -gt 0) {
            foreach ($w in $warnings) { Write-Host "WARNING: $w" }
        }
        exit 0
    } else {
        $missingStr = $missing -join ", "
        Write-Error "Missing required artifacts: $missingStr"
        exit 1
    }
}
