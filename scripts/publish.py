#!/usr/bin/env python3
"""Unified release script for magic-spec.

Bumps versions in:
- installers/python/pyproject.toml
- installers/python/magic_spec/__init__.py
- installers/node/package.json

Then commits, tags, and publishes.
"""

import argparse
import os
import re
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent


def run_command(
    cmd: list[str], cwd: Path, check: bool = True
) -> subprocess.CompletedProcess:
    # Do not print tokens
    display_cmd = []
    for arg in cmd:
        if arg.startswith("--//registry.npmjs.org/:_authToken="):
            display_cmd.append("--//registry.npmjs.org/:_authToken=***")
        elif arg.startswith("--token"):
            display_cmd.append("--token ***")
        else:
            display_cmd.append(arg)
    print(f"Running: {' '.join(display_cmd)} in {cwd}")

    # For security, avoid leaking environment tokens in exception traces by default,
    # but subprocess.run does not print env vars.
    return subprocess.run(cmd, cwd=cwd, check=check, text=True)


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
    print("✅ Updated Python pyproject.toml")

    # Update __init__.py
    content = init_path.read_text(encoding="utf-8")
    content = re.sub(
        r'^__version__\s*=\s*".*"',
        f'__version__ = "{version}"',
        content,
        flags=re.MULTILINE,
    )
    init_path.write_text(content, encoding="utf-8")
    print("✅ Updated Python __init__.py")


def update_node_version(version: str) -> None:
    package_json_path = PROJECT_ROOT / "package.json"
    content = package_json_path.read_text(encoding="utf-8")
    content = re.sub(r'"version":\s*".*"', f'"version": "{version}"', content, count=1)
    package_json_path.write_text(content, encoding="utf-8")
    print("✅ Updated Node package.json")


def update_docs_versions(old_version: str, new_version: str) -> list[str]:
    print("\n📝 Updating versions in documentation...")
    modified_files = []

    # Target files: README.md, CHANGELOG.md, and docs/*.md
    targets = [PROJECT_ROOT / "README.md", PROJECT_ROOT / "CHANGELOG.md"]
    docs_dir = PROJECT_ROOT / "docs"
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

                print(f"✅ Updated {rel_path}")
                modified_files.append(str(rel_path).replace("\\", "/"))
        except Exception as e:
            print(f"⚠️  Could not update {file_path.name}: {e}")

    return modified_files


def commit_and_tag(version: str, docs_files: list[str], dry_run: bool) -> None:
    tag = f"v{version}"
    print(f"\n📦 Committing changes and creating tag {tag}...")

    files_to_add = [
        "pyproject.toml",
        "installers/python/magic_spec/__init__.py",
        "package.json",
    ]
    files_to_add.extend(docs_files)

    if dry_run:
        print(f"  [Dry Run] git add {' '.join(files_to_add)}")
        print(f"  [Dry Run] git commit -m 'Release {tag}'")
        print(f"  [Dry Run] git tag -a {tag} -m 'Release {tag}'")
        print("  [Dry Run] git push origin main --tags")
        return

    # Assuming we want to stage the modified version files
    run_command(["git", "add"] + files_to_add, cwd=PROJECT_ROOT)
    run_command(["git", "commit", "-m", f"Release {tag}"], cwd=PROJECT_ROOT)
    run_command(["git", "tag", "-a", tag, "-m", f"Release {tag}"], cwd=PROJECT_ROOT)

    # We might not want to push automatically if the user wants to verify first, but standard release scripts usually push.
    # run_command(["git", "push", "origin", "main", "--tags"], cwd=PROJECT_ROOT)
    print(
        "✅ Committed and tagged locally. Note: `git push origin main --tags` was skipped for safety and should be run manually."
    )


def publish_python(dry_run: bool) -> None:
    print("\n🐍 Building and publishing Python package...")
    cwd = PROJECT_ROOT

    if dry_run:
        print(f"  [Dry Run] uv build in {cwd}")
        print(f"  [Dry Run] uv publish in {cwd}")
        return

    run_command(["uv", "build"], cwd=cwd)
    run_command(["uv", "publish"], cwd=cwd)
    print("✅ Published Python package")


def publish_node(dry_run: bool) -> None:
    print("\n📦 Publishing Node package...")
    cwd = PROJECT_ROOT

    if dry_run:
        print(f"  [Dry Run] npm publish in {cwd}")
        return

    cmd = ["npm", "publish"]
    npm_token = os.environ.get("NPM_TOKEN")
    if npm_token:
        cmd.append(f"--//registry.npmjs.org/:_authToken={npm_token}")

    run_command(cmd, cwd=cwd)
    print("✅ Published Node package")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Unified release script for magic-spec"
    )
    parser.add_argument(
        "old_version", help="The current version to be replaced in docs (e.g., 1.1.0)"
    )
    parser.add_argument("version", help="The new version to release (e.g., 1.1.1)")
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
    old_version = args.old_version.lstrip("v")
    version = args.version.lstrip("v")

    load_env()

    print(f"🚀 Starting release process: v{old_version} -> v{version}")

    docs_files = []
    if args.dry_run:
        print("⚠️  DRY RUN MODE ENABLED. No files will be modified.")
    else:
        update_python_version(version)
        update_node_version(version)
        docs_files = update_docs_versions(old_version, version)

    commit_and_tag(version, docs_files, args.dry_run)

    if args.skip_publish:
        print("\n⏭️  Skipping publication as requested.")
    else:
        publish_python(args.dry_run)
        publish_node(args.dry_run)

    print("\n🎉 Release completed successfully!")


if __name__ == "__main__":
    main()
