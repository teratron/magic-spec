#!/usr/bin/env python3
"""magic-spec CLI entry point."""

import os
import shutil
import subprocess
import sys
import pathlib


ADAPTERS = {
    "cursor": ".cursor/rules",
    "github": ".github",
    "kilocode": ".kilocode",
    "windsurf": ".windsurf/rules",
}


def _copy_dir(src: pathlib.Path, dest: pathlib.Path) -> None:
    if not src.exists():
        print(f"⚠️  Source not found: {src}")
        return
    shutil.copytree(src, dest, dirs_exist_ok=True)


def main() -> None:
    # Package root: the directory where .magic, .agent, adapters were installed.
    # When installed via pip/uvx, shared-data puts them relative to the package.
    # hatchling shared-data installs to data_dir, accessible via importlib or
    # by resolving relative to this file:
    #   magic_spec/__main__.py  →  site-packages/magic_spec/
    #   shared-data (.magic, .agent, adapters) → data_dir (usually site-packages/../..)
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

    print("🪄 Initializing magic-spec...")

    # 1. Copy .magic (SDD engine)
    _copy_dir(source_root / ".magic", dest / ".magic")

    # 2. Copy agent adapter(s) or default .agent/
    if env_values:
        for env in env_values:
            adapter_src = source_root / "adapters" / env
            adapter_dest_rel = ADAPTERS.get(env)
            if not adapter_dest_rel:
                print(f'⚠️  Unknown --env: "{env}". Valid: {", ".join(ADAPTERS)}')
                _copy_dir(source_root / ".agent", dest / ".agent")
                continue
            if not adapter_src.exists():
                print(f'⚠️  Adapter "{env}" not yet implemented. Using default .agent/')
                _copy_dir(source_root / ".agent", dest / ".agent")
                continue
            _copy_dir(adapter_src, dest / adapter_dest_rel)
            print(f"✅ Adapter installed: {env} → {adapter_dest_rel}/")
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


if __name__ == "__main__":
    main()
