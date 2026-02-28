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
        "download": {
            "timeoutMs": timeout_ms,
            "tempPrefix": parsed["download"].get("tempPrefix", "magic-spec-"),
        },
        "userAgent": {"python": python_user_agent},
        "ejectTargets": parsed.get("eject", {}).get(
            "targets", [".magic", ".agent", ".magic.bak", ".agent.bak"]
        ),
        "removePrefix": parsed.get("removePrefix", ""),
        "engineDir": _require_non_empty_str(parsed.get("engineDir"), "engineDir"),
        "agentDir": _require_non_empty_str(parsed.get("agentDir"), "agentDir"),
        "workflowsDir": _require_non_empty_str(
            parsed.get("workflowsDir"), "workflowsDir"
        ),
        "defaultExt": _require_non_empty_str(parsed.get("defaultExt"), "defaultExt"),
        "workflows": parsed.get("workflows", []),
        "magicFiles": parsed.get("magicFiles", []),
    }


INSTALLER_CONFIG = _load_installer_config()
GITHUB_REPO = INSTALLER_CONFIG["githubRepo"]
PACKAGE_NAME = INSTALLER_CONFIG["packageName"]
DOWNLOAD_TIMEOUT_SECONDS = INSTALLER_CONFIG["download"]["timeoutMs"] / 1000.0
PYTHON_USER_AGENT = INSTALLER_CONFIG["userAgent"]["python"]
DEFAULT_REMOVE_PREFIX = INSTALLER_CONFIG["removePrefix"]
ENGINE_DIR = INSTALLER_CONFIG["engineDir"]
AGENT_DIR = INSTALLER_CONFIG["agentDir"]
WORKFLOWS_DIR = INSTALLER_CONFIG["workflowsDir"]
DEFAULT_EXT = INSTALLER_CONFIG["defaultExt"]
WORKFLOWS = INSTALLER_CONFIG["workflows"]
MAGIC_FILES = INSTALLER_CONFIG["magicFiles"]


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
    extract_dir = (
        target_dir / f"{INSTALLER_CONFIG['download']['tempPrefix']}extraction-{version}"
    )
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


def _convert_to_toml(content: str, description: str) -> str:
    # Escape quotes and backslashes for TOML triple-quoted strings
    escaped_content = content.replace("\\", "\\\\").replace('"""', '\\"\\"\\"')
    escaped_desc = description.replace("\\", "\\\\")
    return 'description = "{}"\n\nprompt = """\n{}\n"""\n'.format(
        escaped_desc, escaped_content
    )


def _convert_to_mdc(content: str, description: str) -> str:
    return f"---\ndescription: {description}\nglobs: \n---\n{content}"


def install_adapter(
    source_root: pathlib.Path, dest: pathlib.Path, env: str, adapters: dict
) -> None:
    adapter = adapters.get(env)
    if not adapter:
        print(f"⚠️  Unknown --env value: '{env}'.")
        print(f"   Valid values: {', '.join(adapters.keys())}")
        print(f"   Falling back to default {AGENT_DIR}/")
        _copy_dir(source_root / AGENT_DIR, dest / AGENT_DIR)
        return

    src_dir = source_root / AGENT_DIR / WORKFLOWS_DIR
    dest_dir = dest / adapter["dest"]

    if not src_dir.exists():
        print(f"⚠️  Source {AGENT_DIR}/{WORKFLOWS_DIR}/ not found.")
        return

    dest_dir.mkdir(parents=True, exist_ok=True)
    target_ext = adapter["ext"]
    remove_prefix = (
        adapter["removePrefix"] if "removePrefix" in adapter else DEFAULT_REMOVE_PREFIX
    )

    for wf_name in WORKFLOWS:
        src_file = src_dir / (wf_name + DEFAULT_EXT)
        if not src_file.exists():
            continue
        dest_name = src_file.stem
        if remove_prefix and dest_name.startswith(remove_prefix):
            dest_name = dest_name[len(remove_prefix) :]

        is_toml = adapter.get("format") == "toml" or target_ext == ".toml"
        is_mdc = adapter.get("format") == "mdc" or target_ext == ".mdc"
        full_dest_name = dest_name + target_ext
        dest_file = dest_dir / full_dest_name

        if is_toml:
            content = src_file.read_text(encoding="utf-8")
            description = f"Magic SDD Workflow: {full_dest_name}"
            dest_file.write_text(
                _convert_to_toml(content, description), encoding="utf-8"
            )
        elif is_mdc:
            content = src_file.read_text(encoding="utf-8")
            description = f"Magic SDD Workflow: {full_dest_name}"
            dest_file.write_text(
                _convert_to_mdc(content, description), encoding="utf-8"
            )
        else:
            shutil.copy2(src_file, dest_file)

    print(f"Adapter installed: {env} -> {adapter['dest']}/ ({target_ext})")


def run_doctor(dest: pathlib.Path) -> int:
    is_windows = sys.platform == "win32"
    check_script = (
        dest / ENGINE_DIR / "scripts" / "check-prerequisites.ps1"
        if is_windows
        else dest / ENGINE_DIR / "scripts" / "check-prerequisites.sh"
    )
    if not check_script.exists():
        print("Error: SDD engine not initialized. Run magic-spec first.")
        return 1

    print(f"🔍 {PACKAGE_NAME} Doctor:")
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
                print(f"✅ {item.get('path', name)} is present")
            else:
                hint = f" (Hint: {required_hint})" if required_hint else ""
                print(f"❌ .design/{name}{hint}")

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
                print(f"✅ {stable} specifications are Stable")
        return 0

    except Exception as e:
        print(f"Failed to parse doctor output: {e}")
        return 1


def run_info(dest: pathlib.Path) -> int:
    print(f"{PACKAGE_NAME} installation status")
    print("────────────────────────────────")

    version_file = dest / ".magic" / ".version"
    installed_version = "none"
    if version_file.exists():
        installed_version = version_file.read_text(encoding="utf-8").strip()
    print(f"Installed version : {installed_version}  (.magic/.version)")

    magicrc_file = dest / ".magicrc"
    active_env = f"default ({AGENT_DIR}/)"
    if magicrc_file.exists():
        try:
            rc = json.loads(magicrc_file.read_text(encoding="utf-8"))
            if "env" in rc:
                active_env = rc["env"]
        except Exception:
            pass
    print(f"Active env        : {active_env}")

    engine_present = (dest / ENGINE_DIR).exists()
    print(
        f"Engine            : {ENGINE_DIR}/     {'✅ present' if engine_present else '❌ missing'}"
    )

    workspace_present = (dest / ".design").exists()
    print(
        f"Workspace         : .design/    {'✅ present' if workspace_present else '❌ missing'}"
    )

    print("────────────────────────────────")
    print(f"Run `{PACKAGE_NAME} --update` to refresh engine files.")
    return 0


def run_check(dest: pathlib.Path) -> int:
    version_file = dest / ENGINE_DIR / ".version"
    if not version_file.exists():
        print(f"⚠️  Not installed via magic-spec (no {ENGINE_DIR}/.version file)")
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
    magic_dir = dest / ENGINE_DIR
    if magic_dir.exists():
        _copy_dir(magic_dir, dest / f"{ENGINE_DIR}.bak")

    agent_dir = dest / AGENT_DIR
    if agent_dir.exists():
        _copy_dir(agent_dir, dest / f"{AGENT_DIR}.bak")

    # Update .gitignore
    gitignore_file = dest / ".gitignore"
    if gitignore_file.exists():
        content = gitignore_file.read_text(encoding="utf-8")
        altered = False
        for entry in [f"{ENGINE_DIR}.bak/", f"{AGENT_DIR}.bak/"]:
            if entry not in content:
                content += f"\n{entry}"
                altered = True
        if altered:
            gitignore_file.write_text(content.strip() + "\n", encoding="utf-8")


def run_eject(dest: pathlib.Path, auto_accept: bool = False) -> int:
    print("\n⚠️  This will remove:")
    print(f"   -  {ENGINE_DIR}/")
    print(f"   -  {AGENT_DIR}/  (or active env adapter dir)")
    print(f"   -  {ENGINE_DIR}.bak/  (if exists)")
    print("\n   Your .design/ workspace will NOT be affected.")

    should_run = auto_accept
    if not should_run:
        try:
            answer = input("\nConfirm? (y/N): ").strip().lower()
            should_run = answer == "y"
        except EOFError:
            should_run = False

    if should_run:
        targets = INSTALLER_CONFIG["ejectTargets"]
        for target in targets:
            p = dest / target
            if p.exists():
                if p.is_dir():
                    shutil.rmtree(p)
                else:
                    p.unlink()
                print(f"🗑️  Removed: {target}/")
        print(f"✅ {PACKAGE_NAME} ejected successfully.")
        return 0
    else:
        print("❌ Eject cancelled.")
        return 0


def _detect_environment(dest: pathlib.Path, adapters: dict) -> str | None:
    for env, item in adapters.items():
        marker = item.get("marker")
        if marker and (dest / marker).exists():
            return env
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
    checksums_file = dest / ENGINE_DIR / ".checksums"
    if not checksums_file.exists():
        return None

    try:
        stored_checksums = json.loads(checksums_file.read_text(encoding="utf-8"))
    except Exception:
        return None

    conflicts = []
    for rel_path, stored_hash in stored_checksums.items():
        local_path = dest / ENGINE_DIR / rel_path
        if local_path.exists():
            current_hash = _get_file_checksum(local_path)
            if current_hash != stored_hash:
                conflicts.append(rel_path)

    if not conflicts:
        return None

    print(f"\n⚠️  Local changes detected in {len(conflicts)} file(s) in {ENGINE_DIR}/:")
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

    return {"choice": choice, "conflicts": conflicts if choice == "s" else []}


def run_list_envs(adapters: dict) -> int:
    print("Supported environments:")
    print(
        f"  (default)    {AGENT_DIR}/{WORKFLOWS_DIR}/magic.*{DEFAULT_EXT}  general agents, Gemini"
    )
    for name, adapter in adapters.items():
        padding = " " * max(0, 12 - len(name))
        dest = f"{adapter['dest']}/".ljust(28)
        description = adapter.get("description", "")
        print(f"  {name}{padding}{dest}{description}")
    print("\nUsage: magic-spec --env <name>  OR  --<name> (e.g. --cursor)")
    return 0


def run_init(dest: pathlib.Path, auto_accept: bool = False) -> None:
    is_windows = sys.platform == "win32"
    if is_windows:
        init_script = dest / ".magic" / "scripts" / "init.ps1"
    else:
        init_script = dest / ".magic" / "scripts" / "init.sh"

    if not init_script.exists():
        return

    should_run = True
    if not auto_accept:
        print(f"\n⚠️  The initialization script will be executed: {init_script}")
        print("   This script may modify your system environment.")
        try:
            answer = input("   Do you want to continue? (y/N): ").strip().lower()
            should_run = answer == "y"
        except EOFError:
            should_run = False
    else:
        print(f"\nℹ️  Auto-accepting initialization script: {init_script}")

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
        print("  --<adapter>          Shortcut for --env <adapter> (e.g. --cursor)")
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
            for env in adapters:
                if f"--{env}" in args:
                    if env not in env_values:
                        env_values.append(env)

            selected_env = None
            if env_values:
                selected_env = env_values[0]
            elif magicrc.get("env"):
                selected_env = magicrc["env"] if magicrc["env"] != "default" else None

            if not selected_env and not is_update:
                detected = _detect_environment(dest, adapters)
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
                conflicts_to_skip = (
                    conflict_result.get("conflicts", []) if conflict_result else []
                )
                if conflicts_to_skip:
                    print(f"⚠️  Skipping {len(conflicts_to_skip)} conflicting file(s).")

            # 1. Copy .magic (SDD engine) - selective [T-3A01]
            src_magic = source_root / ENGINE_DIR
            dest_magic = dest / ENGINE_DIR
            dest_magic.mkdir(parents=True, exist_ok=True)

            for rel_path in MAGIC_FILES:
                if is_update and rel_path in conflicts_to_skip:
                    continue

                src_file = src_magic / rel_path
                dest_file = dest_magic / rel_path
                if src_file.exists():
                    dest_file.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src_file, dest_file)

            # 2. Adapters (skip on --update)
            if not is_update:
                if env_values:
                    for env in env_values:
                        install_adapter(source_root, dest, env, adapters)
                elif selected_env:
                    install_adapter(source_root, dest, selected_env, adapters)
                else:
                    # Default install - selective
                    src_eng = source_root / AGENT_DIR
                    dest_eng = dest / AGENT_DIR
                    dest_eng.mkdir(parents=True, exist_ok=True)
                    (dest_eng / WORKFLOWS_DIR).mkdir(parents=True, exist_ok=True)

                    for wf_name in WORKFLOWS:
                        src_wf = src_eng / WORKFLOWS_DIR / (wf_name + DEFAULT_EXT)
                        if src_wf.exists():
                            shutil.copy2(
                                src_wf,
                                dest_eng / WORKFLOWS_DIR / (wf_name + DEFAULT_EXT),
                            )

                    # Copy other files in .agent if any (not workflows subfolder)
                    for item in src_eng.iterdir():
                        if item.name == WORKFLOWS_DIR:
                            continue
                        if item.is_dir():
                            _copy_dir(item, dest_eng / item.name)
                        else:
                            shutil.copy2(item, dest_eng / item.name)

            # 3. Run init script (skip on --update)
            if not is_update:
                run_init(dest, auto_accept=auto_accept)
                print(f"✅ {PACKAGE_NAME} initialized successfully!")
            else:
                print(f"✅ {PACKAGE_NAME} updated successfully!")

            # 4. Write version file (.magic/.version) - [T-2B01]
            try:
                version_file = dest / ".magic" / ".version"
                real_version = (
                    _resolve_package_version()
                    if version_to_fetch == "main"
                    else version_to_fetch
                )
                version_file.write_text(real_version, encoding="utf-8")
            except Exception as v_err:
                print(f"Warning: Failed to write .magic/.version: {v_err}")

            # 5. Update .magicrc - [T-2C02]
            try:
                new_config = {
                    "env": selected_env or magicrc.get("env") or "default",
                    "version": real_version,
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
