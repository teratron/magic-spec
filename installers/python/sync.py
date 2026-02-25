import shutil
import os
from pathlib import Path

# Paths relative to this script
ROOT = Path(__file__).parent.parent.parent
TARGET = Path(__file__).parent

print("--- Syncing Python Package Data ---")

# 1. Sync engine folders
for folder in [".magic", ".agent", "adapters"]:
    src = ROOT / folder
    dst = TARGET / folder
    if src.exists():
        print(f"Syncing {folder}...")
        if dst.exists():
            if dst.is_dir():
                shutil.rmtree(dst)
            else:
                dst.unlink()
        shutil.copytree(src, dst)
    else:
        print(f"Warning: {folder} not found in root")

# 2. Sync docs and license
for file in ["README.md", "LICENSE"]:
    src = ROOT / file
    dst = TARGET / file
    if src.exists():
        print(f"Syncing {file}...")
        shutil.copy2(src, dst)

print("Done!")
