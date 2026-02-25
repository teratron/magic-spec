#!/usr/bin/env python3
"""magic-spec CLI entry point."""

from __future__ import annotations

import json
import os
import hashlib
import pathlib
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
from importlib.metadata import PackageNotFoundError, version as package_version
import urllib.error
import urllib.request


def _find_installer_config_path() -> pathlib.Path:
    candidates = [
        pathlib.Path(__file__).with_name("config.json"),
        pathlib.Path(__file__).resolve().parents[2] / "config.json",
    ]
    for config_path in candidates:
        if config_path.exists():
            return config_path
    raise RuntimeError("installers/config.json was not found.")


def _require_non_empty_str(value: object, field_name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise RuntimeError(
            f"Invalid installers/config.json: field '{field_name}' must be a non-empty string."
        )
    return value.strip()


def _require_positive_int(value: object, field_name: str) -> int:
    if not isinstance(value, int) or value <= 0:
        raise RuntimeError(
            f"Invalid installers/config.json: field '{field_name}' must be a positive integer."
        )
    return value


def _load_installer_config() -> dict:
    config_path = _find_installer_config_path()
    try:
        parsed = json.loads(config_path.read_text(encoding="utf-8"))
    except Exception as e:
        raise RuntimeError(f"Failed to read installers/config.json: {e}") from e

    if not isinstance(parsed, dict):
        raise RuntimeError(
            "Invalid installers/config.json: root must be a JSON object."
        )

    github_repo = _require_non_empty_str(parsed.get("githubRepo"), "githubRepo")
    package_name = _require_non_empty_str(parsed.get("packageName"), "packageName")

    download_cfg = parsed.get("download")
    if not isinstance(download_cfg, dict):
        raise RuntimeError(
            "Invalid installers/config.json: field 'download' must be an object."
        )
    timeout_ms = _require_positive_int(
        download_cfg.get("timeoutMs"), "download.timeoutMs"
    )

    user_agent_cfg = parsed.get("userAgent")
    if not isinstance(user_agent_cfg, dict):
        raise RuntimeError(
            "Invalid installers/config.json: field 'userAgent' must be an object."
        )
    python_user_agent = _require_non_empty_str(
        user_agent_cfg.get("python"), "userAgent.python"
    )

    return {
        "githubRepo": github_repo,
        "packageName": package_name,
        "download": {"timeoutMs": timeout_ms},
        "userAgent": {"python": python_user_agent},
    }


INSTALLER_CONFIG = _load_installer_config()
GITHUB_REPO = INSTALLER_CONFIG["githubRepo"]
PACKAGE_NAME = INSTALLER_CONFIG["packageName"]
DOWNLOAD_TIMEOUT_SECONDS = INSTALLER_CONFIG["download"]["timeoutMs"] / 1000.0
PYTHON_USER_AGENT = INSTALLER_CONFIG["userAgent"]["python"]


def _resolve_package_version() -> str:
    # Preferred path for installed package and editable runs.
    try:
        from . import __version__  # type: ignore

        if __version__:
            return str(__version__)
    except Exception:
        pass

    # Works when package metadata is available.
    try:
        return package_version(PACKAGE_NAME)
    except PackageNotFoundError:
        pass
    except Exception:
        pass

    # Last local fallback for direct script execution.
    init_file = pathlib.Path(__file__).with_name("__init__.py")
    if init_file.exists():
        content = init_file.read_text(encoding="utf-8")
        match = re.search(r'^\s*__version__\s*=\s*"([^"]+)"', content, re.MULTILINE)
        if match:
            return match.group(1)

    raise RuntimeError(
        "Could not determine magic-spec package version. Use --fallback-main or install package metadata."
    )


def get_download_url(version: str) -> str:
    """Returns the tarball URL for the given version tag."""
    if version == "main":
        return f"https://github.com/{GITHUB_REPO}/archive/refs/heads/main.tar.gz"
    return f"https://github.com/{GITHUB_REPO}/archive/refs/tags/v{version}.tar.gz"


def _parse_csv_values(raw: str) -> list[str]:
    return [item.strip() for item in raw.split(",") if item.strip()]


def _parse_env_values(args: list[str]) -> list[str]:
    parsed: list[str] = []
    i = 0
    while i < len(args):
        if args[i].startswith("--env="):
            parsed.extend(_parse_csv_values(args[i].split("=", 1)[1]))
        elif args[i] == "--env" and i + 1 < len(args):
            parsed.extend(_parse_csv_values(args[i + 1]))
            i += 1
        i += 1

    unique: list[str] = []
    seen: set[str] = set()
    for item in parsed:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


def _is_within_directory(base_dir: pathlib.Path, target: pathlib.Path) -> bool:
    try:
        target.relative_to(base_dir)
        return True
    except ValueError:
        return False


def _safe_extract_tar(archive_path: str, extract_dir: pathlib.Path) -> None:
    with tarfile.open(archive_path, "r:gz") as tar:
        resolved_base = extract_dir.resolve()
        for member in tar.getmembers():
            member_path = (resolved_base / member.name).resolve()
            if not _is_within_directory(resolved_base, member_path):
                raise RuntimeError(
                    f"Unsafe tar entry detected outside target directory: {member.name}"
                )
        tar.extractall(path=extract_dir)


def download_and_extract(version: str, target_dir: pathlib.Path) -> pathlib.Path:
    """
    Downloads the GitHub release tarball for the version and extracts it
    to a temporary directory. Returns the path to the extracted project root.
    """
    url = get_download_url(version)
    version_label = "main branch" if version == "main" else f"v{version}"
    print(f"Downloading magic-spec payload ({version_label}) from GitHub...")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": PYTHON_USER_AGENT})
        with urllib.request.urlopen(req, timeout=DOWNLOAD_TIMEOUT_SECONDS) as response:
            with tempfile.NamedTemporaryFile(
                suffix=".tar.gz", delete=False
            ) as tmp_file:
                shutil.copyfileobj(response, tmp_file)
                tmp_path = tmp_file.name
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"Error: Release {version} not found on GitHub.")
            print("   (Use --fallback-main to pull from the main branch instead)")
            sys.exit(1)
        else:
            print(f"HTTP error downloading payload: {e}")
            sys.exit(1)
    except Exception as e:
        print(f"Error downloading payload: {e}")
        sys.exit(1)

    print("Extracting payload...")
    extract_dir = target_dir / f"magic-spec-extraction-{version}"
    extract_dir.mkdir(parents=True, exist_ok=True)

    try:
        _safe_extract_tar(tmp_path, extract_dir)
    except Exception as e:
        print(f"Error extracting payload: {e}")
        sys.exit(1)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    # Find the extracted root (github tarballs usually have a single root dir like magic-spec-1.1.0)
    extracted_items = list(extract_dir.iterdir())
    if len(extracted_items) == 1 and extracted_items[0].is_dir():
        return extracted_items[0]
    return extract_dir


def _copy_dir(src: pathlib.Path, dest: pathlib.Path) -> None:
    if not src.exists():
        print(f"Warning: source not found: {src}")
        return
    shutil.copytree(src, dest, dirs_exist_ok=True)


def install_adapter(
    source_root: pathlib.Path, dest: pathlib.Path, env: str, adapters: dict
) -> None:
    adapter = adapters.get(env)
    if not adapter:
        print(f'Warning: unknown --env: "{env}". Valid: {", ".join(adapters)}')
        _copy_dir(source_root / ".agent", dest / ".agent")
        return

    src_dir = source_root / ".agent" / "workflows"
    dest_dir = dest / adapter["dest"]

    if not src_dir.exists():
        print("Warning: source .agent/workflows/ not found.")
        return

    dest_dir.mkdir(parents=True, exist_ok=True)
    target_ext = adapter["ext"]
    remove_prefix = adapter.get("removePrefix")

    for src_file in src_dir.glob("*.md"):
        dest_name = src_file.stem
        if remove_prefix and dest_name.startswith(remove_prefix):
            dest_name = dest_name[len(remove_prefix) :]
        dest_name = dest_name + target_ext
        shutil.copy2(src_file, dest_dir / dest_name)

    print(f"Adapter installed: {env} -> {adapter['dest']}/ ({target_ext})")


def run_doctor(dest: pathlib.Path) -> int:
    is_windows = sys.platform == "win32"
    if is_windows:
        check_script = dest / ".magic" / "scripts" / "check-prerequisites.ps1"
    else:
        check_script = dest / ".magic" / "scripts" / "check-prerequisites.sh"

    if not check_script.exists():
        print("Error: SDD engine not initialized. Run magic-spec first.")
        return 1

    print("Magic-spec Doctor:")
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
        if result.returncode != 0:
            print(
                f"Error: doctor prerequisite script failed with code {result.returncode}."
            )
            if result.stderr:
                print(result.stderr.strip())
            return 1

        json_str = result.stdout.strip()
        match = re.search(r"\{.*\}", json_str, re.DOTALL)
        if match:
            json_str = match.group(0)
        if not json_str:
            print("Error: doctor output did not contain JSON.")
            return 1

        data = json.loads(json_str)
        arts = data.get("artifacts", {})

        def check_item(name: str, item: dict, required_hint: str = "") -> None:
            if item and item.get("exists"):
                print(f"OK: {item.get('path', name)} is present")
            else:
                hint = f" (Hint: {required_hint})" if required_hint else ""
                print(f"Missing: .design/{name}{hint}")

        check_item("INDEX.md", arts.get("INDEX.md", {}), "Run /magic.spec")
        check_item("RULES.md", arts.get("RULES.md", {}), "Created at init")

        if "PLAN.md" in arts:
            check_item("PLAN.md", arts["PLAN.md"], "Run /magic.task")
        if "TASKS.md" in arts:
            check_item("TASKS.md", arts["TASKS.md"], "Run /magic.task")

        warnings = data.get("warnings", [])
        for warn in warnings:
            print(f"Warning: {warn}")

        specs = arts.get("specs", {})
        if specs:
            stable = specs.get("stable", 0)
            if stable > 0:
                print(f"OK: {stable} specifications are Stable")
        return 0

    except Exception as e:
        print(f"Failed to parse doctor output: {e}")
        return 1


def run_info(dest: pathlib.Path) -> int:
    print("magic-spec installation status")
    print("────────────────────────────────")

    version_file = dest / ".magic" / ".version"
    installed_version = "none"
    if version_file.exists():
        installed_version = version_file.read_text(encoding="utf-8").strip()
    print(f"Installed version : {installed_version}  (.magic/.version)")

    magicrc_file = dest / ".magicrc"
    active_env = "default (.agent/)"
    if magicrc_file.exists():
        try:
            rc = json.loads(magicrc_file.read_text(encoding="utf-8"))
            if "env" in rc:
                active_env = rc["env"]
        except Exception:
            pass
    print(f"Active env        : {active_env}")

    engine_present = (dest / ".magic").exists()
    print(
        f"Engine            : .magic/     {'✅ present' if engine_present else '❌ missing'}"
    )

    workspace_present = (dest / ".design").exists()
    print(
        f"Workspace         : .design/    {'✅ present' if workspace_present else '❌ missing'}"
    )

    print("────────────────────────────────")
    print("Run `magic-spec --update` to refresh engine files.")
    return 0


def run_check(dest: pathlib.Path) -> int:
    version_file = dest / ".magic" / ".version"
    if not version_file.exists():
        print("⚠️  Not installed via magic-spec (no .magic/.version file)")
        return 0

    installed_version = version_file.read_text(encoding="utf-8").strip()
    try:
        current_version = _resolve_package_version()
    except Exception:
        current_version = "unknown"

    print(f"Installed version: {installed_version}")
    print(f"Package version:   {current_version}")

    if installed_version == current_version:
        print(f"✅ magic-spec {current_version} — up to date")
    else:
        print(f"⚠️  Installed: {installed_version} | Package: {current_version}")
        print("   Run --update to upgrade")
    return 0


def create_backup(dest: pathlib.Path) -> None:
    print("📦 Creating backup of existing engine files...")
    magic_dir = dest / ".magic"
    if magic_dir.exists():
        _copy_dir(magic_dir, dest / ".magic.bak")

    agent_dir = dest / ".agent"
    if agent_dir.exists():
        _copy_dir(agent_dir, dest / ".agent.bak")

    # Update .gitignore
    gitignore_file = dest / ".gitignore"
    if gitignore_file.exists():
        content = gitignore_file.read_text(encoding="utf-8")
        altered = False
        if ".magic.bak" not in content:
            content += "\n.magic.bak/"
            altered = True
        if ".agent.bak" not in content:
            content += "\n.agent.bak/"
            altered = True
        if altered:
            gitignore_file.write_text(content.strip() + "\n", encoding="utf-8")


def run_eject(dest: pathlib.Path, auto_accept: bool = False) -> int:
    print("\n⚠️  This will remove:")
    print("   -  .magic/")
    print("   -  .agent/  (or active env adapter dir)")
    print("   -  .magic.bak/  (if exists)")
    print("\n   Your .design/ workspace will NOT be affected.")

    should_run = auto_accept
    if not should_run:
        try:
            answer = input("\nConfirm? (y/N): ").strip().lower()
            should_run = answer == "y"
        except EOFError:
            should_run = False

    if should_run:
        targets = [".magic", ".agent", ".magic.bak", ".agent.bak"]
        for target in targets:
            p = dest / target
            if p.exists():
                if p.is_dir():
                    shutil.rmtree(p)
                else:
                    p.unlink()
                print(f"🗑️  Removed: {target}/")
        print("✅ magic-spec ejected successfully.")
        return 0
    else:
        print("❌ Eject cancelled.")
        return 1


def _detect_environment(dest: pathlib.Path) -> str | None:
    if (dest / ".cursor").exists():
        return "cursor"
    if (dest / ".windsurf").exists():
        return "windsurf"
    if (dest / ".github").exists():
        return "github"
    if (dest / ".kilocode").exists():
        return "kilocode"
    return None


def _save_magic_rc(dest: pathlib.Path, config: dict) -> None:
    magicrc_file = dest / ".magicrc"
    magicrc_file.write_text(json.dumps(config, indent=2), encoding="utf-8")


def _get_file_checksum(file_path: pathlib.Path) -> str | None:
    if not file_path.exists():
        return None
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def _get_directory_checksums(
    directory: pathlib.Path, base_dir: pathlib.Path | None = None
) -> dict[str, str]:
    results = {}
    if base_dir is None:
        base_dir = directory
    if not directory.exists():
        return results

    for item in directory.iterdir():
        if item.is_dir():
            results.update(_get_directory_checksums(item, base_dir))
        else:
            if item.name == ".checksums":
                continue
            rel_path = str(item.relative_to(base_dir)).replace("\\", "/")
            results[rel_path] = _get_file_checksum(item)
    return results


def _handle_conflicts(dest: pathlib.Path, auto_accept: bool = False) -> dict | None:
    checksums_file = dest / ".magic" / ".checksums"
    if not checksums_file.exists():
        return None

    try:
        stored_checksums = json.loads(checksums_file.read_text(encoding="utf-8"))
    except Exception:
        return None

    conflicts = []
    for rel_path, stored_hash in stored_checksums.items():
        local_path = dest / ".magic" / rel_path
        if local_path.exists():
            current_hash = _get_file_checksum(local_path)
            if current_hash != stored_hash:
                conflicts.append(rel_path)

    if not conflicts:
        return None

    print(f"\n⚠️  Local changes detected in {len(conflicts)} file(s) in .magic/:")
    for f in conflicts[:5]:
        print(f"   - {f}")
    if len(conflicts) > 5:
        print(f"   ... and {len(conflicts) - 5} more.")

    print("\nOptions:")
    print("  [o] Overwrite (backup will be created)")
    print("  [s] Skip update for conflicting files")
    print("  [a] Abort update")

    choice = "o"
    if not auto_accept:
        try:
            answer = input("\nChoice (o/s/a): ").strip().lower()
            choice = (answer or "o")[0]
        except EOFError:
            choice = "a"

    if choice == "a":
        print("❌ Update aborted.")
        sys.exit(1)

    return {"choice": choice, "conflicts": conflicts}


def run_list_envs(adapters: dict) -> int:
    print("Supported environments:")
    print("  (default)    .agent/workflows/magic.*.md  general agents, Gemini")
    for name, adapter in adapters.items():
        padding = " " * max(0, 12 - len(name))
        dest = f"{adapter['dest']}/".ljust(28)
        description = adapter.get("description", "")
        print(f"  {name}{padding}{dest}{description}")
    print("\nUsage: magic-spec --env <name>")
    return 0


def run_init(dest: pathlib.Path, auto_accept: bool = False) -> None:
    is_windows = sys.platform == "win32"
    if is_windows:
        init_script = dest / ".magic" / "scripts" / "init.ps1"
    else:
        init_script = dest / ".magic" / "scripts" / "init.sh"

    if not init_script.exists():
        return

    should_run = auto_accept
    if not should_run:
        print(f"\n⚠️  The initialization script will be executed: {init_script}")
        print("   This script may modify your system environment.")
        try:
            answer = input("   Do you want to continue? (y/N): ").strip().lower()
            should_run = answer == "y"
        except EOFError:
            should_run = False

    if not should_run:
        print("⚠️  Initialization script skipped by user.")
        return

    if is_windows:
        cmd = [
            "powershell.exe",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(init_script),
        ]
    else:
        os.chmod(init_script, 0o755)
        cmd = ["bash", str(init_script)]

    result = subprocess.run(cmd, check=False)
    if result.returncode != 0:
        raise RuntimeError(
            f"Initialization script failed with exit code {result.returncode}."
        )


def main() -> None:
    dest = pathlib.Path.cwd()

    # Parse args
    args = sys.argv[1:]
    env_values = _parse_env_values(args)
    fallback_main = "--fallback-main" in args
    auto_accept = "--yes" in args or "-y" in args
    if "--help" in args or "-h" in args:
        print("Usage: magic-spec [command] [options]")
        print("\nCommands:")
        print("  info                 Show installation status")
        print("  --check              Check for updates")
        print("  --doctor             Run prerequisite check")
        print("  --list-envs          List supported environments")
        print("  --eject              Remove magic-spec from project")
        print("\nOptions:")
        print("  --env <adapter>      Specify environment adapter")
        print("  --update             Update engine files only")
        print("  --fallback-main      Pull payload from main branch")
        print("  --yes                Auto-accept prompts")
        sys.exit(0)

    is_update = "--update" in args
    is_doctor = "--doctor" in args
    is_check = "--check" in args
    is_info = "info" in args
    is_list_envs = "--list-envs" in args
    is_eject = "--eject" in args

    # Command modes (do not need download)
    if is_doctor:
        sys.exit(run_doctor(dest))

    if is_check:
        sys.exit(run_check(dest))

    if is_info:
        sys.exit(run_info(dest))

    if is_eject:
        sys.exit(run_eject(dest, auto_accept=auto_accept))

    # Download Step
    if is_update:
        print("Updating magic-spec (.magic only)...")
        create_backup(dest)
    else:
        print("Initializing magic-spec...")

    version_to_fetch = "main" if fallback_main else _resolve_package_version()

    # Load .magicrc
    magicrc = {}
    magicrc_file = dest / ".magicrc"
    if magicrc_file.exists():
        try:
            magicrc = json.loads(magicrc_file.read_text(encoding="utf-8"))
        except Exception:
            pass

    try:
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

            if is_list_envs:
                sys.exit(run_list_envs(adapters))

            # Determine environment
            selected_env = None
            if env_values:
                selected_env = env_values[0]
            elif magicrc.get("env"):
                selected_env = magicrc["env"]
            elif not is_update:
                detected = _detect_environment(dest)
                if detected and detected in adapters:
                    adapter_desc = adapters[detected].get("description", detected)
                    print(
                        f"\n💡 Detected {adapter_desc} ({detected}/ directory found)."
                    )
                    should_adopt = auto_accept
                    if not should_adopt:
                        try:
                            answer = (
                                input(
                                    f"   Install {detected} adapter instead of default? (y/N): "
                                )
                                .strip()
                                .lower()
                            )
                            should_adopt = answer == "y"
                        except EOFError:
                            should_adopt = False
                    if should_adopt:
                        selected_env = detected

            if is_update:
                conflict_result = _handle_conflicts(dest, auto_accept=auto_accept)
                if conflict_result and conflict_result.get("choice") == "s":
                    print(
                        "⚠️  Selective skip not fully implemented, proceeding with overwrite (backup available)."
                    )
                # Backup already done in main

            # 1. Copy .magic (SDD engine)
            _copy_dir(source_root / ".magic", dest / ".magic")

            # 2. Adapters (skip on --update)
            if not is_update:
                if selected_env:
                    install_adapter(source_root, dest, selected_env, adapters)
                elif env_values:
                    for env in env_values:
                        install_adapter(source_root, dest, env, adapters)
                else:
                    _copy_dir(source_root / ".agent", dest / ".agent")

            # 3. Run init script (skip on --update)
            if not is_update:
                run_init(dest, auto_accept=auto_accept)
                print("magic-spec initialized successfully!")
            else:
                print("magic-spec updated successfully!")

            # 4. Write version file (.magic/.version) - [T-2B01]
            try:
                version_file = dest / ".magic" / ".version"
                version_file.write_text(version_to_fetch, encoding="utf-8")
            except Exception as v_err:
                print(f"Warning: Failed to write .magic/.version: {v_err}")

            # 5. Update .magicrc - [T-2C02]
            try:
                new_config = {
                    "env": selected_env or magicrc.get("env") or "default",
                    "version": version_to_fetch,
                }
                _save_magic_rc(dest, new_config)
            except Exception as rc_err:
                print(f"Warning: Failed to update .magicrc: {rc_err}")

            # 6. Save checksums - [T-2C03]
            try:
                current_checksums = _get_directory_checksums(dest / ".magic")
                (dest / ".magic" / ".checksums").write_text(
                    json.dumps(current_checksums, indent=2), encoding="utf-8"
                )
            except Exception as c_err:
                print(f"Warning: Failed to save checksums: {c_err}")
    except Exception as e:
        print(f"magic-spec initialization failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
