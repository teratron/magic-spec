# Security Policy

This policy tells you which versions of Magic Spec receive security fixes and how to report a vulnerability.

## Supported versions

Security fixes go to the latest minor line of the current major version only.

| Version line | Supported |
| --- | --- |
| `3.0.x` | Yes |
| `2.1.x` | No |
| `2.0.x` | No |
| `1.x` | No |

If you use a line that is not supported, upgrade to the supported line before you report.

## Report a vulnerability

1. Do not open a public issue.
2. Open the repository's **Security** tab and choose **Report a vulnerability**. The direct address is `https://github.com/teratron/magic-spec/security/advisories/new`.
3. State the affected version. It is the content of `skills/magicspec/.version` in your project.
4. Describe the steps to reproduce the problem, one numbered step at a time.
5. Describe the impact: what an attacker can read, write, run or delete.

Reports are private until a fix is released.

## What to expect

1. You get an acknowledgement within 7 days.
2. You get a decision within 30 days: accepted, needs more information, or declined with the reason.
3. An accepted report is fixed in a private branch and released as a patch version.
4. The fix is disclosed in a published security advisory. The advisory credits you unless you ask us not to.

## Scope

In scope:

1. The scripts and files in the release archive of the engine.
2. The installation, update, migration and removal of the engine in a project.
3. The pre-commit hook that the engine installs.
4. The workflows of this repository that build and publish a release.

Out of scope:

1. The behaviour of an AI agent, its host or its model.
2. Vulnerabilities in software that a project using the engine depends on.
3. Reports that show no impact on a project that uses the engine.
4. Findings that need write access to the engine folder of the project first.
