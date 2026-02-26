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
    
    if ($indexExists -and $planExists) {
        # Extract spec filenames from INDEX.md
        $indexSpecs = $lines | Where-Object { $_ -match "\|\s*\[.*?\]\(specifications/(.*?\.md)\)" } | ForEach-Object { 
            if ($_ -match "specifications/(.*?\.md)") { $Matches[1] }
        }
        
        # Check if each spec from INDEX.md exists on disk and is in PLAN.md
        $planContent = Get-Content $planPath -Raw
        foreach ($spec in $indexSpecs) {
            $specFile = Join-Path ".design\specifications" $spec
            if (-not (Test-Path $specFile)) {
                $warnings += "Inconsistency: '$spec' is registered in INDEX.md but file is missing from .design/specifications/"
            }
            if ($planContent -notlike "*$spec*") {
                $warnings += "Orphaned specification: '$spec' is in INDEX.md but missing from PLAN.md"
            }
        }

        # Reverse Sync: Check if PLAN.md mentions specs that aren't in the registry
        $planSpecs = [regex]::Matches($planContent, "specifications/(.*?\.md)") | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
        foreach ($pSpec in $planSpecs) {
            if ($indexSpecs -notcontains $pSpec) {
                $warnings += "Registry Mismatch: '$pSpec' is referenced in PLAN.md but missing from INDEX.md"
            }
        }
        
        # Sync Gap Check: Compare INDEX.md version with PLAN.md "Based on" version
        $indexVersionMatch = $lines | Select-String -Pattern "^\*\*Version:\*\* ([\d\.]+)"
        if ($indexVersionMatch) {
            $indexVersion = $indexVersionMatch.Matches.Groups[1].Value
            $planBasedOnMatch = Select-String -Path $planPath -Pattern "^\*\*Based on:\*\* .*? v([\d\.]+)"
            if ($planBasedOnMatch) {
                $planBasedOn = $planBasedOnMatch.Matches.Groups[1].Value
                if ($indexVersion -ne $planBasedOn) {
                    $warnings += "Sync Gap: PLAN.md is based on INDEX.md v$planBasedOn, but registry is at v$indexVersion. Run 'node .magic/scripts/executor.js generate-plan' (magic.task) to sync."
                }
            }
        }

        # Rule 57 Check: Layer Integrity (L2 Stable/RFC requires Stable L1)
        $specMetadata = @{}
        foreach ($line in $lines) {
            if ($line -match "\|\s*\[(.*?)\]\(specifications/(.*?\.md)\)\s*\|\s*.*?\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|") {
                $file = $Matches[2]
                $status = $Matches[3].Trim()
                $layer = $Matches[4].Trim()
                $specMetadata[$file] = @{ status = $status; layer = $layer }
            }
        }

        foreach ($spec in $indexSpecs) {
            $meta = $specMetadata[$spec]
            if ($meta.layer -eq "implementation" -and ($meta.status -eq "Stable" -or $meta.status -eq "RFC")) {
                $fullPath = Join-Path ".design\specifications" $spec
                if (Test-Path $fullPath) {
                    $content = Get-Content $fullPath -Raw
                    if ($content -match "\*\*Implements:\*\* (.*?\.md)") {
                        $parent = $Matches[1].Trim()
                        if ($specMetadata.ContainsKey($parent)) {
                            $parentStatus = $specMetadata[$parent].status
                            if ($parentStatus -ne "Stable") {
                                $warnings += "Rule 57 Violation: L2 spec '$spec' is $($meta.status), but its L1 parent '$parent' is $parentStatus (Must be Stable)."
                            }
                        } else {
                             $warnings += "Layer Integrity: L2 spec '$spec' implements '$parent' which is missing from INDEX.md."
                        }
                    }
                }
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
