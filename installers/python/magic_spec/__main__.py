#!/usr/bin/env python3
"""magic-spec CLI entry point."""

import os
import shutil
import subprocess
import sys
import pathlib


import json
import re


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
    # Package root: the directory where .magic, .agent, adapters were installed.
    # When installed via pip/uvx, shared-data puts them relative to the package.
    # hatchling shared-data installs to data_dir, accessible via importlib or
    # by resolving relative to this file:
    #   magic_spec/__main__.py  →  site-packages/magic_spec/
    #   shared-data (.magic, .agent) → data_dir (usually site-packages/../..)
    # We search up until we find .magic/.
    pkg_file = pathlib.Path(__file__).resolve()
    pkg_root = pkg_file.parent  # magic_spec/

    # Walk up the tree to find the directory that contains .magic/
    search = pkg_root
    for _ in range(6):
        if (search / ".magic").exists():
            break
        search = search.parent
    else:
        print("❌ Error: .magic directory not found. The package may be corrupt.")
        sys.exit(1)

    source_root = search
    dest = pathlib.Path.cwd()

    try:
        with open(source_root / "adapters.json", "r", encoding="utf-8") as f:
            adapters = json.load(f)
    except Exception:
        adapters = {}

    # Parse --env flags
    args = sys.argv[1:]
    env_values: list[str] = []
    i = 0
    while i < len(args):
        if args[i].startswith("--env="):
            env_values.extend(args[i].split("=", 1)[1].split(","))
        elif args[i] == "--env" and i + 1 < len(args):
            env_values.extend(args[i + 1].split(","))
            i += 1
        elif args[i] in ("--help", "-h"):
            print("Usage: magic-spec [--env <adapter>] [--update] [--doctor | --check]")
            print("Adapters:", ", ".join(adapters.keys()))
            sys.exit(0)
        i += 1

    is_update = "--update" in args
    is_doctor = "--doctor" in args or "--check" in args

    if is_update:
        print("🪄 Updating magic-spec (.magic only)...")
    else:
        print("🪄 Initializing magic-spec...")

    # 1. Copy .magic (SDD engine)
    _copy_dir(source_root / ".magic", dest / ".magic")

    # 2. Adapters (skip on --update or --doctor)
    if not is_update and not is_doctor:
        if env_values:
            for env in env_values:
                install_adapter(source_root, dest, env, adapters)
        else:
            _copy_dir(source_root / ".agent", dest / ".agent")

    # 3. Run init script (skip on --update or --doctor)
    if not is_update and not is_doctor:
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

    # 4. Doctor mode
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

            # Clean out any rogue newlines before parsing
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

            check_item("INDEX.md", arts.get("INDEX.md", {}), "Run /magic.specification")
            check_item("RULES.md", arts.get("RULES.md", {}), "Created at init")

            if "PLAN.md" in arts:
                check_item("PLAN.md", arts["PLAN.md"], "Run /magic.plan")
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


if __name__ == "__main__":
    main()
