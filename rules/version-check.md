# Version Check Rule

When starting work in a project that uses magic-spec, verify the installed engine is current.

## Procedure

1. Read local version from `.magic/.version`.
2. Fetch the remote version:
   `https://raw.githubusercontent.com/teratron/magic-spec/master/.magic/.version`
3. Compare. If local < remote, display:

   > [!TIP]
   > A newer magic-spec version is available.
   > Local: `{local_version}` | Latest: `{remote_version}`
   >
   > Download the latest release: <https://github.com/teratron/magic-spec/releases/latest>
   >
   > Manual update: replace `.magic/`, `workflows/`, `skills/`, `rules/` in your project
   > with the corresponding folders from the new release archive.

4. If versions match or the remote is unreachable, proceed silently.

## Frequency

Run once per day at the start of the first session in a project.
Do not run this check on every command invocation.

## Notes

- The remote fetch should time out gracefully (≤ 3 s) to avoid blocking offline work.
- Versions follow semantic versioning (`major.minor.patch`). A higher numeric value
  in any segment (left to right) means a newer release.
