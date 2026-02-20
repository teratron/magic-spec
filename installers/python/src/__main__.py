import shutil
import pathlib
import subprocess
import sys
import os


def main():
    current_file = pathlib.Path(__file__).resolve()
    # Try finding core folder relative to magic_spec package
    # installers/python/magic_spec/__main__.py -> installers/python/core
    source_root = current_file.parent.parent / "core"

    if not source_root.exists():
        # In actual installation, it might be elsewhere
        # Let's try parent of magic_spec package (site-packages/core)
        source_root = current_file.parent.parent.parent / "core"

    if not source_root.exists():
        print("❌ Error: Core directory not found.")
        sys.exit(1)

    dest = pathlib.Path.cwd()

    print("🪄 Initializing magic-spec...")

    # Copy files
    magic_src = source_root / ".magic"
    agent_src = source_root / ".agent"

    if magic_src.exists():
        # copytree with dirs_exist_ok=True (Python 3.8+)
        shutil.copytree(magic_src, dest / ".magic", dirs_exist_ok=True)
    if agent_src.exists():
        shutil.copytree(agent_src, dest / ".agent", dirs_exist_ok=True)

    # Run initialization
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
                ]
            )
    else:
        init_script = dest / ".magic" / "scripts" / "init.sh"
        if init_script.exists():
            os.chmod(init_script, 0o755)
            subprocess.run(["bash", str(init_script)])

    print("✅ magic-spec initialized successfully!")


if __name__ == "__main__":
    main()
