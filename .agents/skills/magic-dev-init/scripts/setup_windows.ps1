# ═══════════════════════════════════════════════════════════════════════════════
# MAGIC SPEC DEV INIT (WINDOWS)
# ═══════════════════════════════════════════════════════════════════════════════

# Safe junction/hardlink creation for Windows environment.
# Note: Junctions (/J) work without admin or Developer Mode.
# Hardlinks (/H) also work without admin for files.

# ───────────────────────────────────────────────────────────────────────────────
# 1. Configuration
# ───────────────────────────────────────────────────────────────────────────────

# Dynamically discover workflows from source directories
$userWorkflows = Get-ChildItem "workflows\*.md" | Select-Object -ExpandProperty Name
$devWorkflows = Get-ChildItem ".agents\workflows\*.md" | Select-Object -ExpandProperty Name
$agentFiles = @("CLAUDE.md", "GEMINI.md", "QWEN.md", "CODEX.md")

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

# 3.0. Sync Skill Wrappers (Source of Truth: Workflows)
if (Test-Path ".magic\scripts\sync-skills.js") {
    Write-Host "Synchronizing Skill Wrappers..." -ForegroundColor Cyan
    node .magic\scripts\sync-skills.js
}

# 3.1. Git Index Maintenance (MUST run BEFORE creating junctions — see AGENTS.md §6)
Write-Host "Synchronizing git index (pre-link)..." -ForegroundColor Cyan
$linksToRemove = @(
    ".claude\commands", ".claude\skills", ".claude\rules",
    ".qwen\commands", ".qwen\skills", ".qwen\rules",
    ".gemini\commands", ".gemini\skills", ".gemini\rules",
    ".codex\prompts", ".codex\skills", ".codex\rules"
)
foreach ($f in $userWorkflows) { $linksToRemove += ".agents\workflows\$f" }
foreach ($f in $userWorkflows) { 
    $name = $f -replace '\.md$', ''
    $linksToRemove += ".agents\skills\$name"
}
foreach ($f in $agentFiles) { $linksToRemove += "$f" }
git rm -r --cached --ignore-unmatch $linksToRemove 2>$null

# 3.2. Agent junctions (.claude, .qwen, .gemini, .codex)
$agentDirs = @(".claude", ".qwen", ".gemini", ".codex")

foreach ($dir in $agentDirs) {
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force }
    Remove-Existing "$dir\rules"
    if ($dir -eq ".codex") {
        Remove-Existing "$dir\prompts"
        cmd /c "mklink /J $dir\prompts .agents\workflows"
    } else {
        Remove-Existing "$dir\commands"
        cmd /c "mklink /J $dir\commands .agents\workflows"
    }
    Remove-Existing "$dir\skills"
    cmd /c "mklink /J $dir\skills .agents\skills"
    cmd /c "mklink /J $dir\rules .agents\rules"
}

# 3.3. Global Agent Instructions (Linking to AGENTS.md)
Write-Host "Linking agent instruction files..." -ForegroundColor Cyan
foreach ($f in $agentFiles) { 
    Remove-Existing $f
    cmd /c "mklink /H $f AGENTS.md"
}

# 3.4. .agents directories
if (-not (Test-Path ".agents\workflows")) { New-Item -ItemType Directory -Path ".agents\workflows" -Force }
if (-not (Test-Path ".agents\skills")) { New-Item -ItemType Directory -Path ".agents\skills" -Force }
if (-not (Test-Path ".agents\rules")) { New-Item -ItemType Directory -Path ".agents\rules" -Force }

# 3.5. Workflow hardlinks (User-facing)
Write-Host "Creating workflow hardlinks..." -ForegroundColor Cyan
foreach ($f in $userWorkflows) {
    $target = "workflows\$f"
    $link = ".agents\workflows\$f"
    Remove-Existing $link
    cmd /c "mklink /H $link $target"
}

# 3.6. Skill junctions (User-facing)
Write-Host "Creating skill junctions (User-facing)..." -ForegroundColor Cyan
foreach ($f in $userWorkflows) {
    $name = $f -replace '\.md$', ''
    $target = "skills\$name"
    $link = ".agents\skills\$name"
    if (Test-Path $target) {
        $targetFull = (Resolve-Path $target).Path
        $linkFull = (Join-Path (Get-Location) $link)
        Remove-Existing $link
        Write-Host "Linking: $link -> $target" -ForegroundColor Gray
        cmd /c "mklink /J `"$linkFull`" `"$targetFull`"" | Out-Null
    }
}

Write-Host "`n>>> Verification:" -ForegroundColor Green
cmd /c "dir .claude\commands .claude\skills .claude\rules /AL"
cmd /c "dir .qwen\commands .qwen\skills .qwen\rules /AL"
cmd /c "dir .gemini\commands .gemini\skills .gemini\rules /AL"
cmd /c "dir .codex\prompts .codex\skills .codex\rules /AL"

Write-Host "`n>>> Hardlink Integrity Check (AGENTS.md):" -ForegroundColor Cyan
cmd /c "fsutil hardlink list AGENTS.md"
