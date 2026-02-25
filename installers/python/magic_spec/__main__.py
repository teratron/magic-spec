#!/usr/bin/env python3
"""
Magic SDD CLI Installer (Python)
Version: 0.5.0
"""

import sys
import os
import pathlib
import shutil
import subprocess
import json
import tempfile


def _get_version() -> str:
    # Try to get version from package metadata or local fallback
    try:
        from importlib.metadata import version

        return version("magic-spec")
    except Exception:
        # Fallback for source runs
        pkg_json = pathlib.Path(__file__).parents[3] / "package.json"
        if pkg_json.exists():
            try:
                return json.loads(pkg_json.read_text())["version"]
            except Exception:
                pass
        return "1.2.3"


VERSION = _get_version()
CWD = pathlib.Path.cwd()
SOURCE_ROOT = pathlib.Path(__file__).parent.resolve()


def main():
    args = sys.argv[1:]

    if "--help" in args or "-h" in args:
        print_help()
        return

    if "--version" in args or "-v" in args:
        print(VERSION)
        return

    if "--list-envs" in args:
        print("Supported environments: cursor, windsurf, github, kilocode")
        return

    if "info" in args:
        project_version_file = CWD / ".magic" / ".version"
        project_version = "Unknown"
        if project_version_file.exists():
            project_version = project_version_file.read_text(encoding="utf-8").strip()
        print(f"magic-spec CLI v{VERSION}")
        print(f"Project Engine v{project_version}")
        print(f"Install Source: {SOURCE_ROOT}")
        print(f"Current Path: {CWD}")
        return

    is_update = "--update" in args
    is_check = "--check" in args

    if is_check:
        project_version_file = CWD / ".magic" / ".version"
        if project_version_file.exists():
            project_version = project_version_file.read_text(encoding="utf-8").strip()
            if project_version == VERSION:
                print(f"magic-spec v{VERSION} (up to date)")
            else:
                print(f"magic-spec v{project_version} (Update available: v{VERSION})")
        else:
            print(f"magic-spec v{VERSION} (not initialized)")
        return

    if "--eject" in args:
        eject()
        return

    # 1. Perform Installation / Update
    print(
        "🪄  Updating magic-spec..." if is_update else "🪄  Initializing magic-spec..."
    )

    try:
        # --- Engine Sync (Layer 1) ---
        # In a published wheel, .magic is alongside magic_spec/ or in data_dir
        # We look for it in common locations
        engine_src = _find_engine_src()

        folders = [".magic", ".agent"]
        for folder in folders:
            src = engine_src / folder
            dest = CWD / folder
            if src.exists():
                sync_dir(src, dest)

        # --- Version Tracking ---
        (CWD / ".magic" / ".version").write_text(VERSION, encoding="utf-8")

        # --- Adapters Sync ---
        envs = get_env_args(args)
        for env in envs:
            src = engine_src / "adapters" / env
            if src.exists():
                install_adapter(env, src)
            else:
                print(f"⚠️  Adapter not found: {env}")

        # --- Init Script ---
        if not is_update:
            run_init_script()

        print(
            "✅ magic-spec updated successfully!"
            if is_update
            else "✅ magic-spec initialized successfully!"
        )
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


def _find_engine_src() -> pathlib.Path:
    # 1. Check if we are in a wheel (shared-data puts things in sys.prefix or similar)
    # For magic-spec, hatch puts shared-data at the root of the install
    # So we check parents of this file
    candidates = [
        pathlib.Path(__file__).parents[1],  # Inside package?
        pathlib.Path(__file__).parents[2],  # One level up
        pathlib.Path(__file__).parents[3],  # Three levels up (source)
    ]
    for c in candidates:
        if (c / ".magic").exists():
            return c

    # Fallback to sys.prefix (common for shared-data)
    prefix = pathlib.Path(sys.prefix)
    if (prefix / ".magic").exists():
        return prefix

    raise RuntimeError("Could not locate SDD engine files (.magic) in the package.")


def sync_dir(src: pathlib.Path, dest: pathlib.Path):
    if not src.exists():
        return
    if dest.exists():
        # --- Backup Logic (T-2C01) ---
        import time

        timestamp = int(time.time())
        backup_base = CWD / ".magic" / "archives"
        backup_dir = backup_base / f"backup-{timestamp}"

        # Avoid self-nesting and recursion
        if ".magic" + os.sep + "archives" not in str(dest):
            backup_base.mkdir(parents=True, exist_ok=True)
            backup_dir.mkdir(parents=True, exist_ok=True)
            try:
                # Move to unique temp name first
                temp_name = f"magic-backup-{timestamp}-{dest.name}"
                temp_path = pathlib.Path(tempfile.gettempdir()) / temp_name
                shutil.move(str(dest), str(temp_path))
                shutil.move(str(temp_path), str(backup_dir / dest.name))
            except Exception:
                # Fallback to copy + delete
                shutil.copytree(
                    src=dest, dst=backup_dir / dest.name, dirs_exist_ok=True
                )
                shutil.rmtree(dest)

    shutil.copytree(src, dest, dirs_exist_ok=True)


def get_env_args(args: list[str]) -> list[str]:
    envs = []

    # 1. Try to load from .magicrc (T-2C02)
    rc_path = CWD / ".magicrc.json"
    if rc_path.exists():
        try:
            config = json.loads(rc_path.read_text(encoding="utf-8"))
            if "envs" in config and isinstance(config["envs"], list):
                envs.extend(config["envs"])
        except Exception:
            pass

    # 2. Override with CLI args
    try:
        idx = args.index("--env")
        if idx + 1 < len(args):
            cli_envs = [e.strip() for e in args[idx + 1].split(",") if e.strip()]
            envs.extend(cli_envs)

            # Persist to .magicrc
            unique_envs = list(set(envs))
            import datetime

            rc_path.write_text(
                json.dumps(
                    {
                        "envs": unique_envs,
                        "lastUpdated": datetime.datetime.now().isoformat(),
                    },
                    indent=2,
                ),
                encoding="utf-8",
            )
    except ValueError:
        pass

    return list(set(envs))


def install_adapter(env: str, src_dir: pathlib.Path):
    mapping = {
        "cursor": ".cursor/rules",
        "windsurf": ".windsurf/rules",
        "github": ".github",
        "kilocode": ".kilocode",
    }
    target_dir = CWD / mapping.get(env, env)
    copy_recursive_with_templating(src_dir, target_dir)
    print(f"✅ Adapter installed: {env} -> {mapping.get(env, env)}")


def copy_recursive_with_templating(src: pathlib.Path, dest: pathlib.Path):
    if src.is_dir():
        dest.mkdir(parents=True, exist_ok=True)
        for item in src.iterdir():
            if item.name == ".gitkeep":
                continue
            copy_recursive_with_templating(item, dest / item.name)
    else:
        try:
            content = src.read_text(encoding="utf-8")
            is_md = src.suffix in [".md", ".mdc"]
            is_toml = src.suffix == ".toml"

            if is_md:
                content = content.replace("{ARGUMENTS}", "$ARGUMENTS")
            if is_toml:
                content = content.replace("{ARGUMENTS}", "{{args}}")

            dest.write_text(content, encoding="utf-8")
        except UnicodeDecodeError:
            # For binary files (images, etc)
            shutil.copy2(src, dest)


def run_init_script():
    is_windows = sys.platform == "win32"
    script = CWD / ".magic" / "scripts" / ("init.ps1" if is_windows else "init.sh")

    if not script.exists():
        return

    print("🚀 Running initialization script...")
    if is_windows:
        subprocess.run(
            ["powershell.exe", "-ExecutionPolicy", "Bypass", "-File", str(script)],
            shell=True,
        )
    else:
        os.chmod(script, 0o755)
        subprocess.run(["bash", str(script)])


def print_help():
    print("""
Usage: magic-spec [options] [command]

Options:
  --env <names>     Install environment adapters (e.g., --env cursor,windsurf)
  --update          Update .magic/ and .agent/ only
  --check           Check current version
  --list-envs       List supported environments
  --eject           Remove library from project
  --version, -v     Show version
  --help, -h        Show this help

Commands:
  info              Show installation status
    """)


def eject():
    folders = [".magic", ".agent", ".cursor/rules", ".windsurf/rules", ".kilocode"]
    print("📤 Ejecting magic-spec (removing managed files)...")
    for folder in folders:
        p = CWD / folder
        if p.exists():
            print(f"   Removing {folder}...")
            if p.is_dir():
                shutil.rmtree(p)
            else:
                p.unlink()
    print("✅ Eject complete.")


if __name__ == "__main__":
    main()
