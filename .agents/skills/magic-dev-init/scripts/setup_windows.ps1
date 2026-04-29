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
$userRules = @(Get-ChildItem "rules\*" -File -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$RegistryFile = Join-Path (Split-Path -Parent $ScriptDir) "agents.json"

if (-not (Test-Path $RegistryFile)) {
    Write-Error "Registry not found: $RegistryFile"
    exit 1
}

$json = Get-Content $RegistryFile -Raw | ConvertFrom-Json

$REGISTRY = @{}
foreach ($prop in $json.PSObject.Properties) {
    $REGISTRY[$prop.Name] = @{
        name      = $prop.Name
        dir       = $prop.Value.dir
        workflows = $prop.Value.workflows
        skills    = $prop.Value.skills
        rules     = $prop.Value.rules
        files     = if ($prop.Value.files) { @($prop.Value.files) } else { @() }
    }
}
$ALL_AGENTS = $REGISTRY.Keys | Sort-Object

if ($Agents.Count -gt 0) {
    $normalized = $Agents | ForEach-Object { $_.ToLower() }
    $activeAgents = @()
    foreach ($t in $normalized) {
        if (-not $REGISTRY.ContainsKey($t)) {
            Write-Host "ERROR: Unknown agent '$t'. Supported: $($ALL_AGENTS -join ', ')" -ForegroundColor Red
            exit 1
        }
        $activeAgents += $REGISTRY[$t]
    }
    $initMode = "targeted ($($activeAgents.name -join ', '))"
} else {
    $activeAgents = @()
    $initMode = "infrastructure only"
}

# All paths this script manages. Built once, used for cleanup + git index.
$cleanupPaths = @()
foreach ($agKey in $ALL_AGENTS) {
    $ag = $REGISTRY[$agKey]
    if ($ag.workflows) { $cleanupPaths += "$($ag.dir)\$($ag.workflows)" }
    if ($ag.skills) { $cleanupPaths += "$($ag.dir)\$($ag.skills)" }
    if ($ag.rules) { $cleanupPaths += "$($ag.dir)\$($ag.rules)" }
    foreach ($f in $ag.files) { $cleanupPaths += $f }
}
foreach ($f in $userWorkflows) {
    $name = $f -replace '\.md$', ''
    $skillName = $name -replace '\.', '-'
    $cleanupPaths += ".agents\workflows\$f", ".agents\skills\$skillName"
}
$cleanupPaths += ".agents\rules"

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
foreach ($p in $cleanupPaths) { Remove-Link $p }

# 3.3. Git index maintenance — safe now that junctions are gone.
Write-Host "Synchronizing git index..." -ForegroundColor Cyan
git rm -r --cached --ignore-unmatch $cleanupPaths 2>$null | Out-Null

# 3.4. .agents/ infrastructure (must exist before agent junctions point to it)
foreach ($d in @(".agents\workflows", ".agents\skills")) {
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}

if (-not (Test-Path ".agents\rules")) { New-Item -ItemType Directory -Path ".agents\rules" -Force | Out-Null }

Write-Host "Creating rules hardlinks..." -ForegroundColor Cyan
foreach ($r in $userRules) {
    New-Hardlink ".agents\rules\$r" "rules\$r"
    Write-Host "  .agents\rules\$r" -ForegroundColor Gray
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
    if ($ag.workflows) { New-Junction "$($ag.dir)\$($ag.workflows)" ".agents\workflows" }
    if ($ag.skills)    { New-Junction "$($ag.dir)\$($ag.skills)"    ".agents\skills" }
    if ($ag.rules)     { New-Junction "$($ag.dir)\$($ag.rules)"     ".agents\rules" }
    Write-Host "  $($ag.dir) ($($ag.name))" -ForegroundColor Gray
}

# 3.8. Instruction hardlinks: {AGENT}.md → AGENTS.md
Write-Host "Creating instruction hardlinks..." -ForegroundColor Cyan
foreach ($ag in $activeAgents) {
    foreach ($f in $ag.files) {
        New-Hardlink $f "AGENTS.md"
        Write-Host "  $f" -ForegroundColor Gray
    }
}

# ───────────────────────────────────────────────────────────────────────────────
# 4. Verification
# ───────────────────────────────────────────────────────────────────────────────

Write-Host "`n>>> Verification:" -ForegroundColor Green
foreach ($ag in $activeAgents) {
    $w = if ($ag.workflows) { """$($ag.dir)\$($ag.workflows)""" } else { "" }
    $s = if ($ag.skills) { """$($ag.dir)\$($ag.skills)""" } else { "" }
    $r = if ($ag.rules) { """$($ag.dir)\$($ag.rules)""" } else { "" }
    if ($w -or $s -or $r) { cmd /c "dir $w $s $r /AL 2>nul" }
}

$expected = 1
foreach ($ag in $activeAgents) { $expected += $ag.files.Count }
Write-Host "`n>>> AGENTS.md hardlinks (expected: $expected):" -ForegroundColor Cyan
cmd /c "fsutil hardlink list AGENTS.md"
