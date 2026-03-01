import os
import sys
import json
import shutil
import tarfile
import pathlib
import urllib.request
import urllib.error
import tempfile
import hashlib
import time
from typing import Optional

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")


def _load_config() -> dict:
    local_path = (
        pathlib.Path(__file__).resolve().parents[3] / "installers" / "config.json"
    )
    if local_path.exists():
        with open(local_path, "r", encoding="utf-8") as f:
            return json.load(f)

    package_path = pathlib.Path(__file__).resolve().parent / "config.json"
    if package_path.exists():
        with open(package_path, "r", encoding="utf-8") as f:
            return json.load(f)

    print("❌ Installer config error: config.json was not found")
    sys.exit(1)


_INSTALLER_CONFIG = _load_config()

# Version and Repo info
GITHUB_REPO = _INSTALLER_CONFIG.get("githubRepo", "teratron/magic-spec")
PACKAGE_NAME = _INSTALLER_CONFIG.get("packageName", "magic-spec")
ENGINE_DIR = _INSTALLER_CONFIG.get("engineDir", ".magic")
AGENT_DIR = _INSTALLER_CONFIG.get("agentDir", ".agent")
WORKFLOWS_DIR = _INSTALLER_CONFIG.get("workflowsDir", "workflows")
DEFAULT_EXT = _INSTALLER_CONFIG.get("defaultExt", ".md")

# List of files to sync for the SDD engine (.magic)
MAGIC_FILES = _INSTALLER_CONFIG.get("magicFiles", [])

# List of core workflows to sync for the AI agent (.agent)
WORKFLOWS = _INSTALLER_CONFIG.get("workflows", [])

PYTHON_USER_AGENT = _INSTALLER_CONFIG.get("userAgent", {}).get(
    "python", "magic-spec-cli"
)
DOWNLOAD_TIMEOUT_SECONDS = (
    _INSTALLER_CONFIG.get("download", {}).get("timeoutMs", 60000) // 1000
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
    _safe_extract_tar(tmp_path, target_dir)
    os.unlink(tmp_path)

    # GitHub tarballs have a top-level dir like 'magic-spec-1.0.0'
    for item in target_dir.iterdir():
        if item.is_dir():
            return item
    return target_dir


def _get_file_checksum(file_path: pathlib.Path) -> Optional[str]:
    if not file_path.exists():
        return None
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def _get_directory_checksums(directory: pathlib.Path) -> dict[str, str]:
    checksums = {}
    if not directory.exists():
        return checksums
    for root, _, files in os.walk(directory):
        for file in files:
            full_path = pathlib.Path(root) / file
            rel_path = full_path.relative_to(directory).as_posix()
            checksums[rel_path] = _get_file_checksum(full_path)
    return checksums


def _handle_conflicts(dest: pathlib.Path, auto_accept: bool = False) -> dict:
    checksum_file = dest / ENGINE_DIR / ".checksums"
    if not checksum_file.exists():
        return {"choice": "o", "conflicts": []}

    try:
        old_checksums = json.loads(checksum_file.read_text(encoding="utf-8"))
    except Exception:
        return {"choice": "o", "conflicts": []}

    current_checksums = _get_directory_checksums(dest / ENGINE_DIR)
    conflicts = []
    for rel_path, current_hash in current_checksums.items():
        if rel_path == ".checksums" or rel_path == ".version":
            continue
        old_hash = old_checksums.get(rel_path)
        if old_hash and current_hash != old_hash:
            conflicts.append(rel_path)

    if not conflicts:
        return {"choice": "o", "conflicts": []}

    print(f"\n⚠️  Detected local changes in {len(conflicts)} core file(s):")
    for c in conflicts[:5]:
        print(f"   - {c}")
    if len(conflicts) > 5:
        print(f"   - ... and {len(conflicts) - 5} more")

    if auto_accept:
        print("ℹ️  Auto-overwriting local changes.")
        return {"choice": "o", "conflicts": conflicts}

    print("\nHow to proceed?")
    print("  [o] Overwrite local changes (recommended)")
    print("  [s] Skip modified files")
    print("  [a] Abort update")

    while True:
        try:
            choice = input("Select an option [O/s/a]: ").strip().lower() or "o"
            if choice == "o":
                return {"choice": "o", "conflicts": conflicts}
            if choice == "s":
                return {"choice": "s", "conflicts": conflicts}
            if choice == "a":
                print("Update aborted.")
                sys.exit(0)
        except EOFError:
            return {"choice": "s", "conflicts": conflicts}


def create_backup(dest: pathlib.Path) -> None:
    backup_dir = dest / ".magic" / "backups" / f"backup_{int(time.time())}"
    backup_dir.mkdir(parents=True, exist_ok=True)

    # Backup .magic
    engine_src = dest / ENGINE_DIR
    if engine_src.exists():
        shutil.copytree(
            engine_src,
            backup_dir / ENGINE_DIR,
            ignore=shutil.ignore_patterns("backups"),
        )

    # Backup .agent
    agent_src = dest / AGENT_DIR
    if agent_src.exists():
        shutil.copytree(agent_src, backup_dir / AGENT_DIR)

    print(f"📦 Backup created at: {backup_dir.relative_to(dest)}")


def _copy_dir(src: pathlib.Path, dst: pathlib.Path) -> None:
    if not dst.exists():
        dst.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        if item.is_dir():
            _copy_dir(item, dst / item.name)
        else:
            shutil.copy2(item, dst / item.name)


def _convert_to_mdc(content: str, description: str) -> str:
    return f"---\ndescription: {description}\nglobs: \n---\n\n{content}"


def install_adapter(
    source_root: pathlib.Path, dest: pathlib.Path, env_name: str, adapters: dict
) -> bool:
    if env_name not in adapters:
        return False

    config = adapters[env_name]
    marker = config.get("marker")
    dest_path = config.get("dest")
    output_format = config.get("format", "md")

    if marker:
        (dest / marker).mkdir(parents=True, exist_ok=True)

    abs_dest = dest / dest_path
    abs_dest.mkdir(parents=True, exist_ok=True)

    src_agent = source_root / AGENT_DIR
    src_workflows = src_agent / WORKFLOWS_DIR

    # Copy workflows with conversion
    count = 0
    for wf in WORKFLOWS:
        # wf is something like "magic.spec"
        src_file = src_workflows / (wf + DEFAULT_EXT)
        if not src_file.exists():
            continue

        content = src_file.read_text(encoding="utf-8")

        # Determine output filename
        dest_filename = wf + config.get("ext", DEFAULT_EXT)

        # Remove prefix if requested
        remove_prefix = config.get("removePrefix", "magic.")
        if remove_prefix and dest_filename.startswith(remove_prefix):
            dest_filename = dest_filename[len(remove_prefix) :]

        target_file = abs_dest / dest_filename

        if output_format == "mdc":
            description = f"Magic SDD Workflow: {dest_filename}"
            content = _convert_to_mdc(content, description)
        elif output_format == "toml":
            # Gemini-style prompts in TOML
            content = f'prompt = """\n{content}\n"""'

        target_file.write_text(content, encoding="utf-8")
        count += 1

    # Copy other files from .agent
    for item in src_agent.iterdir():
        if item.name == WORKFLOWS_DIR:
            continue
        if item.is_dir():
            _copy_dir(item, dest / AGENT_DIR / item.name)
        else:
            (dest / AGENT_DIR).mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, dest / AGENT_DIR / item.name)

    print(f"Adapter installed: {env_name} -> {dest_path} (.{output_format})")
    return True


def _detect_environments(dest: pathlib.Path, adapters: dict) -> list[str]:
    detected = []
    for env, item in adapters.items():
        marker = item.get("marker")
        if marker and (dest / marker).exists():
            detected.append(env)
    return detected


def _resolve_package_version() -> str:
    # In a real tool, this would call PyPI/NPM API.
    # For now, we return a hardcoded version.
    return "1.4.2"


def run_doctor(dest: pathlib.Path) -> int:
    print(f"🩺 {PACKAGE_NAME} Doctor:")
    checks = {
        "Python": sys.version.split()[0],
        ".magic engine": "Present" if (dest / ENGINE_DIR).exists() else "Missing",
        ".agent workflows": "Present" if (dest / AGENT_DIR).exists() else "Missing",
    }
    for k, v in checks.items():
        print(f"  [{'✅' if 'Missing' not in v else '❌'}] {k}: {v}")
    return 0


def run_check(dest: pathlib.Path) -> int:
    curr = "Unknown"
    v_file = dest / ENGINE_DIR / ".version"
    if v_file.exists():
        curr = v_file.read_text(encoding="utf-8").strip()
    remote = _resolve_package_version()
    print(f"Current version: {curr}")
    print(f"Latest version : {remote}")
    if curr != remote:
        print("\n🚀 Update available! Run `magic-spec --update`.")
    else:
        print("\n✅ You are on the latest version.")
    return 0


def run_info(dest: pathlib.Path) -> int:
    print("\nmagic-spec installation status")
    print("" + "─" * 32)

    installed_version = "None"
    version_file = dest / ".magic" / ".version"
    if version_file.exists():
        installed_version = version_file.read_text(encoding="utf-8").strip()
    print(f"Installed version : {installed_version}  (.magic/.version)")

    active_envs = []
    # Load adapters to detect environment
    try:
        config_path = _find_installer_config_path()
        adapters_path = config_path.parent / "adapters.json"
        if adapters_path.exists():
            adapters = json.loads(adapters_path.read_text(encoding="utf-8"))
            active_envs = _detect_environments(dest, adapters)
    except Exception:
        pass

    if not active_envs:
        print(f"Active env        : default ({AGENT_DIR}/)")
    else:
        print(f"Active envs       : {', '.join(active_envs)}")

    engine_present = (dest / ENGINE_DIR).exists()
    print(
        f"Engine            : {ENGINE_DIR}/     {'✅ present' if engine_present else '❌ missing'}"
    )

    workspace_present = (dest / ".design").exists()
    print(
        f"Workspace         : .design/    {'✅ present' if workspace_present else '❌ missing'}"
    )

    print("" + "─" * 32)
    print("Run `magic-spec --update` to refresh engine files.")
    return 0


def _find_installer_config_path() -> pathlib.Path:
    # Try local dev path first, then installed package path
    # __file__ is installers/python/magic_spec/__main__.py
    local = pathlib.Path(__file__).resolve().parents[3] / "installers" / "adapters.json"
    if local.exists():
        return local
    return pathlib.Path(__file__).resolve().parent / "adapters.json"


def run_eject(dest: pathlib.Path, auto_accept: bool = False) -> int:
    print("🗑️  Ejecting magic-spec from project...")
    if not auto_accept:
        ans = (
            input("   Are you sure? This will remove .magic and .agent. (y/N): ")
            .strip()
            .lower()
        )
        if ans != "y":
            print("Aborted.")
            return 1

    shutil.rmtree(dest / ENGINE_DIR, ignore_errors=True)
    shutil.rmtree(dest / AGENT_DIR, ignore_errors=True)
    print("✅ magic-spec ejected successfully.")
    return 0


def run_init(dest: pathlib.Path, auto_accept: bool = False) -> None:
    # In real world this would run the powershell/bash init script
    pass


def main() -> None:
    dest = pathlib.Path.cwd()
    args = sys.argv[1:]
    env_values = _parse_env_values(args)
    fallback_main = "--fallback-main" in args
    is_local = "--local" in args
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
        print("  --local              Use local project files instead of GitHub")
        print("  --fallback-main      Pull payload from main branch")
        print("  --yes                Auto-accept prompts")
        sys.exit(0)

    is_update = "--update" in args
    is_doctor = "--doctor" in args
    is_check = "--check" in args
    is_info = "info" in args
    is_list_envs = "--list-envs" in args
    is_eject = "--eject" in args

    if is_doctor:
        sys.exit(run_doctor(dest))
    if is_check:
        sys.exit(run_check(dest))
    if is_info:
        sys.exit(run_info(dest))
    if is_eject:
        sys.exit(run_eject(dest, auto_accept=auto_accept))

    if is_update:
        if is_local:
            print("Updating magic-spec (.magic only) from local files...")
        else:
            print("Updating magic-spec (.magic only)...")
        create_backup(dest)
    else:
        if is_local:
            print("Initializing magic-spec from local files...")
        else:
            print("Initializing magic-spec...")

    version_to_fetch = "main" if fallback_main else _resolve_package_version()

    try:
        source_root = None
        if is_local:
            # Source root is the parent of the package (top level of git repo)
            source_root = pathlib.Path(__file__).resolve().parents[3]
            print(f"🏠 Using local project files from: {source_root}")
        else:
            temp_dir = tempfile.mkdtemp()
            temp_dir_path = pathlib.Path(temp_dir)
            source_root = download_and_extract(version_to_fetch, temp_dir_path)

        adapters_path = source_root / "installers" / "adapters.json"
        adapters = json.loads(adapters_path.read_text(encoding="utf-8"))

        if is_list_envs:
            sys.exit(0)

        for env in adapters:
            if f"--{env}" in args:
                if env not in env_values:
                    env_values.append(env)

        selected_env = None
        if env_values:
            selected_env = env_values[0]

        if not selected_env and not is_update:
            detected = _detect_environments(dest, adapters)
            if detected:
                if len(detected) == 1:
                    env = detected[0]
                    adapter_desc = adapters[env].get("description", env)
                    print(
                        f"\n💡 Detected {adapter_desc} ({adapters[env].get('marker')}/ directory found)."
                    )
                    if (
                        auto_accept
                        or input(f"   Install {env} adapter? (y/N): ").lower() == "y"
                    ):
                        selected_env = env
                else:
                    print(f"\n💡 Multiple environments detected: {', '.join(detected)}")
                    print("   Use --env <name> or --<name> to target specific one.")

        conflicts_to_skip = []
        if is_update:
            cr = _handle_conflicts(dest, auto_accept=auto_accept)
            conflicts_to_skip = (
                cr.get("conflicts", []) if cr.get("choice") == "s" else []
            )

        # 1. Copy .magic
        src_magic = source_root / ENGINE_DIR
        dest_magic = dest / ENGINE_DIR
        dest_magic.mkdir(parents=True, exist_ok=True)
        for rel in MAGIC_FILES:
            if is_update and rel in conflicts_to_skip:
                continue
            sf, df = src_magic / rel, dest_magic / rel
            if sf.exists():
                df.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(sf, df)

        # 2. Adapters
        if not is_update:
            if env_values:
                for ev in env_values:
                    install_adapter(source_root, dest, ev, adapters)
            elif selected_env:
                install_adapter(source_root, dest, selected_env, adapters)
            else:
                # Default
                src_eng, dest_eng = source_root / AGENT_DIR, dest / AGENT_DIR
                dest_eng.mkdir(parents=True, exist_ok=True)
                for item in src_eng.iterdir():
                    if item.is_dir():
                        _copy_dir(item, dest_eng / item.name)
                    else:
                        shutil.copy2(item, dest_eng / item.name)

        if not is_update:
            run_init(dest, auto_accept=auto_accept)
            print(f"✅ {PACKAGE_NAME} initialized successfully!")
        else:
            print(f"✅ {PACKAGE_NAME} updated successfully!")

        real_version = (
            _resolve_package_version()
            if version_to_fetch == "main"
            else version_to_fetch
        )
        (dest / ".magic" / ".version").write_text(real_version, encoding="utf-8")

        current_checksums = _get_directory_checksums(dest / ".magic")
        (dest / ".magic" / ".checksums").write_text(
            json.dumps(current_checksums, indent=2), encoding="utf-8"
        )

    except Exception as e:
        print(f"magic-spec initialization failed: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
