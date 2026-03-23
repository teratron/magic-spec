# ═══════════════════════════════════════════════════════════════════════════════
# MAGIC-SPEC DEV INIT (WINDOWS)
# ═══════════════════════════════════════════════════════════════════════════════

# Safe junction/hardlink creation for Windows environment.
# Note: Junctions (/J) work without admin or Developer Mode.
# Hardlinks (/H) also work without admin for files.

# ───────────────────────────────────────────────────────────────────────────────
# 1. Configuration
# ───────────────────────────────────────────────────────────────────────────────

$workflows = @("analyze", "rule", "run", "spec", "task")
$agentFiles = @("CLAUDE.md", "QWEN.md")

# ───────────────────────────────────────────────────────────────────────────────
# 2. Cleanup function
# ───────────────────────────────────────────────────────────────────────────────

function Remove-Existing($path) {
    if (Test-Path $path) {
        Write-Host "Removing: $path" -ForegroundColor Yellow
        if ((Get-Item $path).Attributes -match "ReparsePoint") {
            # It's a junction or symlink
            if ((Get-Item $path).PSIsContainer) { cmd /c "rmdir $path" } else { cmd /c "del $path" }
        } else {
            # Regular file/directory
            Remove-Item -Recurse -Force $path
        }
    }
}

# ───────────────────────────────────────────────────────────────────────────────
# 3. Main Execution
# ───────────────────────────────────────────────────────────────────────────────

Write-Host ">>> Initializing Windows Agent Environment..." -ForegroundColor Cyan

# 3.1. Git Index Maintenance (MUST run BEFORE creating junctions — see AGENTS.md §6)
Write-Host "Synchronizing git index (pre-link)..." -ForegroundColor Cyan
$linksToRemove = @(
    ".claude\commands",
    ".claude\skills",
    ".claude\rules"
)
foreach ($f in $workflows) { $linksToRemove += ".agents\workflows\magic.$f.md" }
foreach ($f in $agentFiles) { $linksToRemove += "$f" }
git rm -r --cached --ignore-unmatch $linksToRemove 2>$null

# 3.2. .claude junctions
if (-not (Test-Path ".claude")) { New-Item -ItemType Directory -Path ".claude" -Force }
Remove-Existing ".claude\commands"
Remove-Existing ".claude\skills"
Remove-Existing ".claude\rules"
cmd /c "mklink /J .claude\commands .agents\workflows"
cmd /c "mklink /J .claude\skills .agents\skills"
cmd /c "mklink /J .claude\rules .agents\rules"

# 3.3. Global Agent Instructions (Linking to AGENTS.md)
Write-Host "Linking agent instruction files..." -ForegroundColor Cyan
foreach ($f in $agentFiles) { 
    Remove-Existing $f
    cmd /c "mklink /H $f AGENTS.md"
}

# 3.4. .agents junctions
if (-not (Test-Path ".agents\skills")) { New-Item -ItemType Directory -Path ".agents\skills" -Force }
if (-not (Test-Path ".agents\workflows")) { New-Item -ItemType Directory -Path ".agents\workflows" -Force }
if (-not (Test-Path ".agents\rules")) { New-Item -ItemType Directory -Path ".agents\rules" -Force }

# 3.5. Workflow hardlinks
Write-Host "Creating workflow hardlinks..." -ForegroundColor Cyan
foreach ($f in $workflows) {
    $name = "magic.$f.md"
    $target = "workflows\$name"
    $link = ".agents\workflows\$name"
    Remove-Existing $link
    cmd /c "mklink /H $link $target"
}

Write-Host "`n>>> Verification:" -ForegroundColor Green
cmd /c "dir .claude\commands .claude\skills .claude\rules /AL"

Write-Host "`n>>> Hardlink Integrity Check (AGENTS.md):" -ForegroundColor Cyan
cmd /c "fsutil hardlink list AGENTS.md"
