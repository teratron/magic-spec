#!/usr/bin/env python3
"""magic-spec CLI entry point."""

import os
import shutil
import subprocess
import sys
import pathlib


ADAPTERS = {
    "cursor": {"dest": ".cursor/rules", "ext": ".mdc"},
    "github": {"dest": ".github", "ext": ".md"},
    "kilocode": {"dest": ".kilocode", "ext": ".md"},
    "windsurf": {"dest": ".windsurf/rules", "ext": ".md"},
}


def _copy_dir(src: pathlib.Path, dest: pathlib.Path) -> None:
    if not src.exists():
        print(f"⚠️  Source not found: {src}")
        return
    shutil.copytree(src, dest, dirs_exist_ok=True)


def install_adapter(source_root: pathlib.Path, dest: pathlib.Path, env: str) -> None:
    adapter = ADAPTERS.get(env)
    if not adapter:
        print(f'⚠️  Unknown --env: "{env}". Valid: {", ".join(ADAPTERS)}')
        _copy_dir(source_root / ".agent", dest / ".agent")
        return

    src_dir = source_root / ".agent" / "workflows"
    dest_dir = dest / adapter["dest"]

    if not src_dir.exists():
        print(f"⚠️  Source .agent/workflows/ not found.")
        return

    dest_dir.mkdir(parents=True, exist_ok=True)
    target_ext = adapter["ext"]

    for src_file in src_dir.glob("*.md"):
        dest_name = src_file.stem
        if env == "cursor":
            dest_name = dest_name.replace("magic.", "")
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
            print("Usage: magic-spec [--env <adapter>] [--update]")
            print("Adapters:", ", ".join(ADAPTERS.keys()))
            sys.exit(0)
        i += 1

    is_update = "--update" in args

    if is_update:
        print("🪄 Updating magic-spec (.magic only)...")
    else:
        print("🪄 Initializing magic-spec...")

    # 1. Copy .magic (SDD engine)
    _copy_dir(source_root / ".magic", dest / ".magic")

    # 2. Adapters (skip on --update)
    if not is_update:
        if env_values:
            for env in env_values:
                install_adapter(source_root, dest, env)
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
    else:
        print("✅ magic-spec updated successfully!")


if __name__ == "__main__":
    main()
