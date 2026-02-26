# Gemini Protocol & Debugging

This document contains recommendations for the Gemini agent working in a Windows environment and methods for troubleshooting terminal-related issues.

## 1. Terminal Issues (PowerShell)

If terminal commands stop responding or the agent "hangs" on simple operations, it is likely due to accumulated hanging PowerShell (`pwsh.exe`) processes that are blocking system resources or holding file locks.

## 2. Recommendations

### 2.1. Use -NoProfile Flag (Agent Duty)

The agent MUST use the `-NoProfile` flag whenever possible. This ensures PowerShell starts in a "clean" state, ignoring custom user profiles and modules, which is significantly faster and more reliable for automated tasks.

### 2.2. "Cleaner" Script (User/Agent Action)

If performance degrades, use the following command to forcefully terminate all orphaned `pwsh` processes instead of manually using Task Manager:

```powershell
# Forcefully terminate all pwsh processes except the current one
Get-Process pwsh | Where-Object { $_.Id -ne $PID } | Stop-Process -Force
```

### 2.3. Interactivity Checks

Commands like `git push` or `npm publish` may prompt for credentials or confirmation (Y/N). If a command becomes non-responsive, it is likely waiting for input.

**Tip:** For automated tasks, always use non-interactive flags such as `--yes`, `-f`, or `--non-interactive`.
