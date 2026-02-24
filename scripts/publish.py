#!/usr/bin/env python3
"""Unified release script for magic-spec.

Bumps versions in:
- installers/python/pyproject.toml
- installers/python/magic_spec/__init__.py
- installers/node/package.json

Then commits, tags, and publishes.
"""

import argparse
import re
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent


def run_command(
    cmd: list[str], cwd: Path, check: bool = True
) -> subprocess.CompletedProcess:
    print(f"Running: {' '.join(cmd)} in {cwd}")
    return subprocess.run(cmd, cwd=cwd, check=check, text=True)


def update_python_version(version: str) -> None:
    pyproject_path = PROJECT_ROOT / "installers" / "python" / "pyproject.toml"
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
    package_json_path = PROJECT_ROOT / "installers" / "node" / "package.json"
    content = package_json_path.read_text(encoding="utf-8")
    content = re.sub(r'"version":\s*".*"', f'"version": "{version}"', content, count=1)
    package_json_path.write_text(content, encoding="utf-8")
    print("✅ Updated Node package.json")


def commit_and_tag(version: str, dry_run: bool) -> None:
    tag = f"v{version}"
    print(f"\n📦 Committing changes and creating tag {tag}...")

    if dry_run:
        print("  [Dry Run] git add .")
        print(f"  [Dry Run] git commit -m 'Release {tag}'")
        print(f"  [Dry Run] git tag -a {tag} -m 'Release {tag}'")
        print("  [Dry Run] git push origin main --tags")
        return

    # Assuming we want to stage the modified version files
    run_command(
        [
            "git",
            "add",
            "installers/python/pyproject.toml",
            "installers/python/magic_spec/__init__.py",
            "installers/node/package.json",
        ],
        cwd=PROJECT_ROOT,
    )
    run_command(["git", "commit", "-m", f"Release {tag}"], cwd=PROJECT_ROOT)
    run_command(["git", "tag", "-a", tag, "-m", f"Release {tag}"], cwd=PROJECT_ROOT)

    # We might not want to push automatically if the user wants to verify first, but standard release scripts usually push.
    # run_command(["git", "push", "origin", "main", "--tags"], cwd=PROJECT_ROOT)
    print(
        "✅ Committed and tagged locally. Note: `git push origin main --tags` was skipped for safety and should be run manually."
    )


def publish_python(dry_run: bool) -> None:
    print("\n🐍 Building and publishing Python package...")
    cwd = PROJECT_ROOT / "installers" / "python"

    if dry_run:
        print(f"  [Dry Run] uv build in {cwd}")
        print(f"  [Dry Run] uv publish in {cwd}")
        return

    run_command(["uv", "build"], cwd=cwd)
    run_command(["uv", "publish"], cwd=cwd)
    print("✅ Published Python package")


def publish_node(dry_run: bool) -> None:
    print("\n📦 Publishing Node package...")
    cwd = PROJECT_ROOT / "installers" / "node"

    if dry_run:
        print(f"  [Dry Run] npm publish in {cwd}")
        return

    run_command(["npm", "publish"], cwd=cwd)
    print("✅ Published Node package")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Unified release script for magic-spec"
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
    version = args.version.lstrip("v")

    print(f"🚀 Starting release process for v{version}")

    if args.dry_run:
        print("⚠️  DRY RUN MODE ENABLED. No files will be modified.")
    else:
        update_python_version(version)
        update_node_version(version)

    commit_and_tag(version, args.dry_run)

    if args.skip_publish:
        print("\n⏭️  Skipping publication as requested.")
    else:
        publish_python(args.dry_run)
        publish_node(args.dry_run)

    print("\n🎉 Release completed successfully!")


if __name__ == "__main__":
    main()
