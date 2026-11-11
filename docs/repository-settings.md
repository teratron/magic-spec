# Repository Settings

Some of the repository's community files depend on settings that only a maintainer can change on the hosting service. This page lists each setting, the exact path to it, why it matters and how to verify it. Nothing here is assumed done: check each row after any change to the repository's ownership or its reporting channels.

## Settings

| Setting | Where | Why it matters | State observed 2026-11-11 | How to verify |
| --- | --- | --- | --- | --- |
| Private vulnerability reporting | Repository **Settings** → **Security** → **Advanced Security** → **Private vulnerability reporting** | The security policy tells reporters to use it. Without it, a reporter has no private channel. | Enabled | Open the repository's **Security** tab. The **Report a vulnerability** button is visible. |
| Discussions | Repository **Settings** → **General** → **Features** → **Discussions** | No file links to Discussions. The setting is documented so that nobody adds a link while it is off. | Disabled | Open the repository's main page. There is no **Discussions** tab. |
| Label `agent-feedback` | Repository **Issues** → **Labels** → **New label** | The agent-feedback issue form applies it. A form that names a missing label files the issue without it. | Missing | Open **Issues** → **Labels**. A label named `agent-feedback` is listed. |

The state column was read from the hosting service on the date shown. Re-read it before relying on it.

## What to do now

1. Create the label `agent-feedback` (**Issues** → **Labels** → **New label**). Suggested colour: `#5319e7`.
2. Keep Discussions disabled, or enable it and add a link to it where it helps. Either way, do not link a Discussions page while the setting is off.
3. Verify private vulnerability reporting still shows the **Report a vulnerability** button.

## Files that depend on these settings

| File | Depends on |
| --- | --- |
| `SECURITY.md` | Private vulnerability reporting |
| `.github/ISSUE_TEMPLATE/config.yml` | Private vulnerability reporting |
| `.github/ISSUE_TEMPLATE/agent-feedback.yml` | Label `agent-feedback` |
