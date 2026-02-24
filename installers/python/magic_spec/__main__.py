#!/usr/bin/env python3
"""magic-spec CLI entry point."""

import os
import shutil
import subprocess
import sys
import pathlib
import json
import re
import urllib.request
import urllib.error
import tarfile
import tempfile

try:
    from . import __version__
except ImportError:
    __version__ = "1.2.3"

GITHUB_REPO = "teratron/magic-spec"


def get_download_url(version: str) -> str:
    """Returns the tarball URL for the given version tag."""
    if version == "main":
        return f"https://github.com/{GITHUB_REPO}/archive/refs/heads/main.tar.gz"
    return f"https://github.com/{GITHUB_REPO}/archive/refs/tags/v{version}.tar.gz"


def download_and_extract(version: str, target_dir: pathlib.Path) -> pathlib.Path:
    """
    Downloads the GitHub release tarball for the version and extracts it
    to a temporary directory. Returns the path to the extracted project root.
    """
    url = get_download_url(version)
    print(f"📥 Downloading magic-spec payload (v{version}) from GitHub...")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "magic-spec-cli"})
        with urllib.request.urlopen(req) as response:
            with tempfile.NamedTemporaryFile(
                suffix=".tar.gz", delete=False
            ) as tmp_file:
                shutil.copyfileobj(response, tmp_file)
                tmp_path = tmp_file.name
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"❌ Error: Release {version} not found on GitHub.")
            print("   (Use --fallback-main to pull from the main branch instead)")
            sys.exit(1)
        else:
            print(f"❌ HTTP Error downloading payload: {e}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error downloading payload: {e}")
        sys.exit(1)

    print("📦 Extracting payload...")
    extract_dir = target_dir / f"magic-spec-extraction-{version}"
    extract_dir.mkdir(parents=True, exist_ok=True)

    try:
        with tarfile.open(tmp_path, "r:gz") as tar:
            tar.extractall(path=extract_dir)
    except Exception as e:
        print(f"❌ Error extracting payload: {e}")
        os.remove(tmp_path)
        sys.exit(1)
    finally:
        os.remove(tmp_path)

    # Find the extracted root (github tarballs usually have a single root dir like magic-spec-1.1.0)
    extracted_items = list(extract_dir.iterdir())
    if len(extracted_items) == 1 and extracted_items[0].is_dir():
        return extracted_items[0]
    return extract_dir


def _copy_dir(src: pathlib.Path, dest: pathlib.Path) -> None:
    if not src.exists():
        print(f"⚠️  Source not found: {src}")
        return
    shutil.copytree(src, dest, dirs_exist_ok=True)


def install_adapter(
    source_root: pathlib.Path, dest: pathlib.Path, env: str, adapters: dict
) -> None:
    adapter = adapters.get(env)
    if not adapter:
        print(f'⚠️  Unknown --env: "{env}". Valid: {", ".join(adapters)}')
        _copy_dir(source_root / ".agent", dest / ".agent")
        return

    src_dir = source_root / ".agent" / "workflows"
    dest_dir = dest / adapter["dest"]

    if not src_dir.exists():
        print("⚠️  Source .agent/workflows/ not found.")
        return

    dest_dir.mkdir(parents=True, exist_ok=True)
    target_ext = adapter["ext"]
    remove_prefix = adapter.get("removePrefix")

    for src_file in src_dir.glob("*.md"):
        dest_name = src_file.stem
        if remove_prefix:
            dest_name = dest_name.replace(remove_prefix, "")
        dest_name = dest_name + target_ext
        shutil.copy2(src_file, dest_dir / dest_name)

    print(f"✅ Adapter installed: {env} → {adapter['dest']}/ ({target_ext})")


def main() -> None:
    dest = pathlib.Path.cwd()

    # Parse args
    args = sys.argv[1:]
    env_values: list[str] = []
    fallback_main = False
    i = 0
    while i < len(args):
        if args[i].startswith("--env="):
            env_values.extend(args[i].split("=", 1)[1].split(","))
        elif args[i] == "--env" and i + 1 < len(args):
            env_values.extend(args[i + 1].split(","))
            i += 1
        elif args[i] == "--fallback-main":
            fallback_main = True
        elif args[i] in ("--help", "-h"):
            print(
                "Usage: magic-spec [--env <adapter>] [--update] [--doctor | --check] [--fallback-main]"
            )
            sys.exit(0)
        i += 1

    is_update = "--update" in args
    is_doctor = "--doctor" in args or "--check" in args

    # 4. Doctor mode (Doesn't need download)
    if is_doctor:
        is_windows = sys.platform == "win32"
        if is_windows:
            check_script = dest / ".magic" / "scripts" / "check-prerequisites.ps1"
        else:
            check_script = dest / ".magic" / "scripts" / "check-prerequisites.sh"

        if not check_script.exists():
            print("❌ Error: SDD engine not initialized. Run magic-spec first.")
            sys.exit(1)

        print("🔍 Magic-spec Doctor:")
        try:
            if is_windows:
                cmd = [
                    "powershell.exe",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-File",
                    str(check_script),
                    "-json",
                ]
            else:
                cmd = ["bash", str(check_script), "--json"]

            result = subprocess.run(cmd, capture_output=True, text=True, check=False)
            json_str = result.stdout.strip()

            match = re.search(r"\{.*\}", json_str, re.DOTALL)
            if match:
                json_str = match.group(0)

            data = json.loads(json_str)
            arts = data.get("artifacts", {})

            def check_item(name: str, item: dict, required_hint: str = "") -> None:
                if item and item.get("exists"):
                    print(f"✅ {item.get('path', name)} is present")
                else:
                    hint = f" (Hint: {required_hint})" if required_hint else ""
                    print(f"❌ .design/{name} is missing{hint}")

            check_item("INDEX.md", arts.get("INDEX.md", {}), "Run /magic.spec")
            check_item("RULES.md", arts.get("RULES.md", {}), "Created at init")

            if "PLAN.md" in arts:
                check_item("PLAN.md", arts["PLAN.md"], "Run /magic.task")
            if "TASKS.md" in arts:
                check_item("TASKS.md", arts["TASKS.md"], "Run /magic.task")

            warnings = data.get("warnings", [])
            for warn in warnings:
                print(f"⚠️  {warn}")

            specs = arts.get("specs", {})
            if specs:
                stable = specs.get("stable", 0)
                if stable > 0:
                    print(f"✅ {stable} specifications are Stable")

        except Exception as e:
            print(f"❌ Failed to parse doctor output: {e}")
        sys.exit(0)

    # Download Step
    if is_update:
        print("🪄 Updating magic-spec (.magic only)...")
    else:
        print("🪄 Initializing magic-spec...")

    version_to_fetch = "main" if fallback_main else __version__

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir_path = pathlib.Path(temp_dir)
        source_root = download_and_extract(version_to_fetch, temp_dir_path)

        try:
            with open(
                source_root / "installers" / "adapters.json", "r", encoding="utf-8"
            ) as f:
                adapters = json.load(f)
        except Exception:
            adapters = {}

        # 1. Copy .magic (SDD engine)
        _copy_dir(source_root / ".magic", dest / ".magic")

        # 2. Adapters (skip on --update)
        if not is_update:
            if env_values:
                for env in env_values:
                    install_adapter(source_root, dest, env, adapters)
            else:
                _copy_dir(source_root / ".agent", dest / ".agent")

        # 3. Run init script (skip on --update)
        if not is_update:
            is_windows = sys.platform == "win32"
            if is_windows:
                init_script = dest / ".magic" / "scripts" / "init.ps1"
                if init_script.exists():
                    subprocess.run(
                        [
                            "powershell.exe",
                            "-ExecutionPolicy",
                            "Bypass",
                            "-File",
                            str(init_script),
                        ],
                        check=False,
                    )
            else:
                init_script = dest / ".magic" / "scripts" / "init.sh"
                if init_script.exists():
                    os.chmod(init_script, 0o755)
                    subprocess.run(["bash", str(init_script)], check=False)
            print("✅ magic-spec initialized successfully!")
        elif is_update:
            print("✅ magic-spec updated successfully!")


if __name__ == "__main__":
    main()
