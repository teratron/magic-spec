#!/usr/bin/env python3
"""Unified release script for magic-spec.

Bumps versions in:
- pyproject.toml
- installers/python/magic_spec/__init__.py
- package.json

Then commits, tags, and publishes.
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent


def load_config() -> dict:
    config_path = PROJECT_ROOT / "installers" / "config.json"
    if not config_path.exists():
        return {}
    import json

    return json.loads(config_path.read_text(encoding="utf-8"))


CONFIG = load_config()


def run_command(
    cmd: list[str], cwd: Path | str, check: bool = True
) -> subprocess.CompletedProcess:
    cwd_path = Path(cwd)
    # Do not print tokens
    display_cmd = []
    skip_next = False
    for i, arg in enumerate(cmd):
        if skip_next:
            skip_next = False
            continue
        if arg.startswith("--//registry.npmjs.org/:_authToken="):
            display_cmd.append("--//registry.npmjs.org/:_authToken=***")
        elif arg == "--token":
            display_cmd.append("--token ***")
            skip_next = True
        else:
            display_cmd.append(arg)
    print(f"Running: {' '.join(display_cmd)} in {cwd_path}")

    # Use shell=True on Windows for better compatibility with git and other wrappers,
    # and to ensure proper argument quoting and path handling.
    is_windows = os.name == "nt"
    try:
        return subprocess.run(
            cmd, cwd=cwd_path, check=check, text=True, shell=is_windows
        )
    except subprocess.CalledProcessError:
        if check:
            raise
        return subprocess.CompletedProcess(cmd, 1)


def load_env() -> None:
    env_path = PROJECT_ROOT / ".env"
    if not env_path.exists():
        return
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            key, sep, val = line.partition("=")
            if sep:
                os.environ[key.strip()] = val.strip().strip("'\"")


def update_python_version(version: str) -> None:
    pyproject_path = PROJECT_ROOT / "pyproject.toml"
    init_path = PROJECT_ROOT / "installers" / "python" / "magic_spec" / "__init__.py"

    # Update pyproject.toml
    content = pyproject_path.read_text(encoding="utf-8")
    content = re.sub(
        r'^version\s*=\s*".*"', f'version = "{version}"', content, flags=re.MULTILINE
    )
    pyproject_path.write_text(content, encoding="utf-8")
    print("Updated Python pyproject.toml")

    # Update __init__.py
    content = init_path.read_text(encoding="utf-8")
    content = re.sub(
        r'^\s*__version__\s*=\s*".*"',
        f'__version__ = "{version}"',
        content,
        flags=re.MULTILINE,
    )
    init_path.write_text(content, encoding="utf-8")
    print("Updated Python __init__.py")


def update_node_version(version: str) -> None:
    package_json_path = PROJECT_ROOT / "package.json"
    content = package_json_path.read_text(encoding="utf-8")
    content = re.sub(r'"version":\s*".*"', f'"version": "{version}"', content, count=1)
    package_json_path.write_text(content, encoding="utf-8")
    print("Updated Node package.json")


def update_magic_version(version: str) -> None:
    magic_version_path = PROJECT_ROOT / ".magic" / ".version"
    if magic_version_path.exists():
        magic_version_path.write_text(version, encoding="utf-8")
        print("Updated Project Core .magic/.version")


def get_current_old_version() -> str:
    pyproject_path = PROJECT_ROOT / "pyproject.toml"
    if not pyproject_path.exists():
        return ""
    content = pyproject_path.read_text(encoding="utf-8")
    match = re.search(r'^version\s*=\s*"(.*)"', content, flags=re.MULTILINE)
    if match:
        return match.group(1)
    return ""


def get_magic_version_target() -> str:
    magic_path = PROJECT_ROOT / ".magic" / ".version"
    if magic_path.exists():
        return magic_path.read_text(encoding="utf-8").strip()
    return ""


def update_docs_versions(old_version: str, new_version: str) -> list[str]:
    print("\nUpdating versions in documentation...")
    modified_files = []

    # Target files from config
    publish_cfg = CONFIG.get("publish", {})
    docs_targets = publish_cfg.get("docsTargets", ["README.md", "CHANGELOG.md"])
    targets = [PROJECT_ROOT / f for f in docs_targets]

    docs_dir_name = publish_cfg.get("docsDir", "docs")
    docs_dir = PROJECT_ROOT / docs_dir_name
    if docs_dir.exists():
        targets.extend(list(docs_dir.rglob("*.md")))

    for file_path in targets:
        if not file_path.exists():
            continue

        try:
            content = file_path.read_text(encoding="utf-8")
            if old_version in content:
                new_content = content.replace(old_version, new_version)
                file_path.write_text(new_content, encoding="utf-8")

                # Make path relative to project root for cleaner output
                try:
                    rel_path = file_path.relative_to(PROJECT_ROOT)
                except ValueError:
                    rel_path = file_path.name

                print(f"Updated {rel_path}")
                modified_files.append(str(rel_path).replace("\\", "/"))
        except Exception as e:
            print(f"Warning: could not update {file_path.name}: {e}")

    return modified_files


def commit_and_tag(version: str, docs_files: list[str], dry_run: bool) -> None:
    tag = f"v{version}"
    print(f"\nCommitting changes and creating tag {tag}...")

    publish_cfg = CONFIG.get("publish", {})
    files_to_add = publish_cfg.get(
        "versionFiles",
        [
            "pyproject.toml",
            "installers/python/magic_spec/__init__.py",
            "package.json",
            ".magic/.version",
        ],
    )
    files_to_add.extend(docs_files)

    if dry_run:
        print(f"  [Dry Run] git add {' '.join(files_to_add)}")
        print(f"  [Dry Run] git commit -m 'Release {tag}'")
        print(f"  [Dry Run] git tag -a {tag} -m 'Release {tag}'")
        print("  [Dry Run] git push origin master --tags")
        return

    # Assuming we want to stage the modified version files
    try:
        run_command(["git", "add"] + files_to_add, cwd=str(PROJECT_ROOT))
    except subprocess.CalledProcessError as e:
        print(f"  Warning: git add failed (might be no changes): {e}")

    # Check if there are staged changes to commit
    status = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=PROJECT_ROOT)
    if status.returncode != 0:
        try:
            run_command(
                ["git", "commit", "-m", f"Release {tag}"], cwd=str(PROJECT_ROOT)
            )
        except subprocess.CalledProcessError as e:
            print(f"  Error: git commit failed: {e}")
            raise
    else:
        print("  (Nothing to commit, skipping step)")

    # Use -f to overwrite tag if it exists
    run_command(
        ["git", "tag", "-f", "-a", tag, "-m", f"Release {tag}"], cwd=str(PROJECT_ROOT)
    )

    # Standard release scripts usually push.
    run_command(["git", "push", "origin", "master", "--tags"], cwd=str(PROJECT_ROOT))
    print(f"Successfully committed, tagged and pushed {tag} to origin master.")


def publish_python(dry_run: bool) -> None:
    print("\nBuilding and publishing Python package...")
    cwd = PROJECT_ROOT

    if dry_run:
        print(f"  [Dry Run] uv build in {cwd}")
        print(f"  [Dry Run] uv publish in {cwd}")
        return

    run_command(["uv", "build"], cwd=cwd)

    cmd = ["uv", "publish"]
    uv_token = os.environ.get("UV_PUBLISH_TOKEN")
    if uv_token:
        # Avoid printing token is handled in run_command (needs to be added if not there)
        cmd.extend(["--token", uv_token])

    run_command(cmd, cwd=cwd)
    print("Published Python package")


def publish_node(dry_run: bool) -> None:
    print("\nBuilding and publishing Node package...")
    cwd = PROJECT_ROOT

    if dry_run:
        print(f"  [Dry Run] npm pack --pack-destination dist in {cwd}")
        print(f"  [Dry Run] npm publish in {cwd}")
        return

    # Build artifact for verification/storage
    run_command(["npm", "pack", "--pack-destination", "dist"], cwd=cwd)

    cmd = ["npm", "publish"]
    npm_token = os.environ.get("NPM_TOKEN")
    if npm_token:
        cmd.append(f"--//registry.npmjs.org/:_authToken={npm_token}")

    run_command(cmd, cwd=cwd)
    print("Published Node package")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Unified release script for magic-spec"
    )
    parser.add_argument(
        "old_version",
        nargs="?",
        help="The current version to be replaced in docs (e.g., 1.1.0)",
    )
    parser.add_argument(
        "version",
        nargs="?",
        help="The new version to release (e.g., 1.1.1). If not provided, it is autodetected.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Perform a dry run without modifying files or publishing",
    )
    parser.add_argument(
        "--skip-publish",
        action="store_true",
        help="Skip publishing to registries (only bump versions and tag)",
    )

    args = parser.parse_args()

    if args.old_version and args.version:
        old_version = args.old_version.lstrip("v")
        version = args.version.lstrip("v")
    else:
        version = get_magic_version_target().lstrip("v")
        old_version = get_current_old_version().lstrip("v")
        if not version or not old_version:
            import sys

            print(
                "Error: Could not autodetect versions from .magic/.version and pyproject.toml."
            )
            print(
                "Please provide them manually: python publish.py <old_version> <new_version>"
            )
            sys.exit(1)
        print(f"Autodetected versions: {old_version} -> {version}")

    load_env()

    # Ensure dist directory exists
    dist_dir = PROJECT_ROOT / "dist"
    if not args.dry_run:
        dist_dir.mkdir(exist_ok=True)

    print(f"Starting release process: v{old_version} -> v{version}")

    docs_files = []
    if args.dry_run:
        print("WARNING: dry-run mode enabled. No files will be modified.")
    else:
        update_python_version(version)
        update_node_version(version)
        update_magic_version(version)
        docs_files = update_docs_versions(old_version, version)

    commit_and_tag(version, docs_files, args.dry_run)

    if args.skip_publish:
        print("\nSkipping publication as requested.")
    else:
        publish_python(args.dry_run)
        publish_node(args.dry_run)

    print("\nRelease completed successfully!")


if __name__ == "__main__":
    main()
