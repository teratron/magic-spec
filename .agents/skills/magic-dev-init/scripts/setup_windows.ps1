# ═══════════════════════════════════════════════════════════════════════════════
# MAGIC SPEC DEV INIT (WINDOWS)
# ═══════════════════════════════════════════════════════════════════════════════
#
# Creates junctions (/J) and hardlinks (/H) mapping agent-facing paths to the
# canonical engine sources. Junctions and hardlinks work without admin rights.
#
# Usage (run from repo root):
#   pwsh -NoProfile -File setup_windows.ps1              # full init
#   pwsh -NoProfile -File setup_windows.ps1 claude       # only Claude
#   pwsh -NoProfile -File setup_windows.ps1 claude qwen  # Claude + Qwen

param(
    [string[]]$Agents = @()
)

$ErrorActionPreference = "Stop"

# ───────────────────────────────────────────────────────────────────────────────
# 1. Configuration
# ───────────────────────────────────────────────────────────────────────────────

if (-not (Test-Path "AGENTS.md") -or -not (Test-Path "workflows")) {
    Write-Host "ERROR: Must run from repo root (AGENTS.md and workflows/ required)." -ForegroundColor Red
    exit 1
}

$userWorkflows = @(Get-ChildItem "workflows\*.md" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)

$allAgentConfig = @(
    @{ name = "claude"; dir = ".claude"; file = "CLAUDE.md"; subdir = "commands" },
    @{ name = "gemini"; dir = ".gemini"; file = "GEMINI.md"; subdir = "commands" },
    @{ name = "qwen";   dir = ".qwen";   file = "QWEN.md";   subdir = "commands" },
    @{ name = "codex";  dir = ".codex";  file = "CODEX.md";  subdir = "prompts"  }
)

if ($Agents.Count -gt 0) {
    $normalized = $Agents | ForEach-Object { $_.ToLower() }
    $activeAgents = @($allAgentConfig | Where-Object { $normalized -contains $_.name })
    if ($activeAgents.Count -eq 0) {
        Write-Host "ERROR: No matching agents for '$($Agents -join ', ')'. Valid: claude, gemini, qwen, codex" -ForegroundColor Red
        exit 1
    }
    $initMode = "targeted ($($activeAgents.name -join ', '))"
} else {
    $activeAgents = $allAgentConfig
    $initMode = "full"
}

# All paths this script manages. Built once, used for cleanup + git index.
$managedPaths = @()
foreach ($ag in $activeAgents) {
    $managedPaths += "$($ag.dir)\$($ag.subdir)", "$($ag.dir)\skills", "$($ag.dir)\rules", $ag.file
}
foreach ($f in $userWorkflows) {
    $name = $f -replace '\.md$', ''
    $skillName = $name -replace '\.', '-'
    $managedPaths += ".agents\workflows\$f", ".agents\skills\$skillName"
}
$managedPaths += ".agents\rules"

# ───────────────────────────────────────────────────────────────────────────────
# 2. Helpers
# ───────────────────────────────────────────────────────────────────────────────

function Remove-Link {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return }
    $item = Get-Item $Path -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        if ($item.PSIsContainer) { cmd /c "rmdir `"$Path`"" | Out-Null }
        else { cmd /c "del /F /Q `"$Path`"" | Out-Null }
    } else {
        Remove-Item -Recurse -Force $Path
    }
}

function New-Junction {
    param([string]$Link, [string]$Target)
    cmd /c "mklink /J `"$Link`" `"$Target`"" | Out-Null
}

function New-Hardlink {
    param([string]$Link, [string]$Target)
    cmd /c "mklink /H `"$Link`" `"$Target`"" | Out-Null
}

# ───────────────────────────────────────────────────────────────────────────────
# 3. Execution
# ───────────────────────────────────────────────────────────────────────────────

Write-Host ">>> Initializing Windows Agent Environment ($initMode)" -ForegroundColor Cyan

# 3.1. Sync Skill wrappers (source of truth: workflows/)
if (Test-Path ".magic\scripts\sync-skills.js") {
    Write-Host "Synchronizing Skill wrappers..." -ForegroundColor Cyan
    node .magic\scripts\sync-skills.js
}

# 3.2. Cleanup — must happen BEFORE git rm so `git rm -r --cached` cannot
#      traverse junctions and physically delete target files (see AGENTS.md §8).
Write-Host "Removing existing managed links..." -ForegroundColor Cyan
foreach ($p in $managedPaths) { Remove-Link $p }

# 3.3. Git index maintenance — safe now that junctions are gone.
Write-Host "Synchronizing git index..." -ForegroundColor Cyan
git rm -r --cached --ignore-unmatch $managedPaths 2>$null | Out-Null

# 3.4. .agents/ infrastructure (must exist before agent junctions point to it)
foreach ($d in @(".agents\workflows", ".agents\skills")) {
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}

Write-Host "Creating rules junction..." -ForegroundColor Cyan
if (Test-Path "rules") {
    New-Junction ".agents\rules" "rules"
    Write-Host "  .agents\rules -> rules" -ForegroundColor Gray
} else {
    if (-not (Test-Path ".agents\rules")) { New-Item -ItemType Directory -Path ".agents\rules" -Force | Out-Null }
}

# 3.5. Workflow hardlinks: .agents/workflows/*.md → workflows/*.md
Write-Host "Creating workflow hardlinks..." -ForegroundColor Cyan
foreach ($f in $userWorkflows) {
    New-Hardlink ".agents\workflows\$f" "workflows\$f"
    Write-Host "  .agents\workflows\$f" -ForegroundColor Gray
}

# 3.6. Skill junctions: .agents/skills/<name> → skills/<name>
Write-Host "Creating skill junctions..." -ForegroundColor Cyan
foreach ($f in $userWorkflows) {
    $name = $f -replace '\.md$', ''
    $skillName = $name -replace '\.', '-' # Handle magic.rule -> magic-rule
    if (Test-Path "skills\$skillName") {
        New-Junction ".agents\skills\$skillName" "skills\$skillName"
        Write-Host "  .agents\skills\$skillName" -ForegroundColor Gray
    }
}

# 3.7. Agent junctions: .{agent}/{subdir,skills,rules} → .agents/
Write-Host "Creating agent junctions..." -ForegroundColor Cyan
foreach ($ag in $activeAgents) {
    if (-not (Test-Path $ag.dir)) { New-Item -ItemType Directory -Path $ag.dir -Force | Out-Null }
    New-Junction "$($ag.dir)\$($ag.subdir)" ".agents\workflows"
    New-Junction "$($ag.dir)\skills"         ".agents\skills"
    New-Junction "$($ag.dir)\rules"          ".agents\rules"
    Write-Host "  $($ag.dir) ($($ag.name))" -ForegroundColor Gray
}

# 3.8. Instruction hardlinks: {AGENT}.md → AGENTS.md
Write-Host "Creating instruction hardlinks..." -ForegroundColor Cyan
foreach ($ag in $activeAgents) {
    New-Hardlink $ag.file "AGENTS.md"
    Write-Host "  $($ag.file)" -ForegroundColor Gray
}

# ───────────────────────────────────────────────────────────────────────────────
# 4. Verification
# ───────────────────────────────────────────────────────────────────────────────

Write-Host "`n>>> Verification:" -ForegroundColor Green
foreach ($ag in $activeAgents) {
    cmd /c "dir $($ag.dir)\$($ag.subdir) $($ag.dir)\skills $($ag.dir)\rules /AL" 2>$null
}

$expected = 1 + $activeAgents.Count
Write-Host "`n>>> AGENTS.md hardlinks (expected: $expected):" -ForegroundColor Cyan
cmd /c "fsutil hardlink list AGENTS.md"
