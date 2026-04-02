import io
import sys
import json
import shutil
import pathlib
import subprocess
import unittest
import os

if sys.stdout.encoding != "utf-8" and isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout.reconfigure(encoding="utf-8")


# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════
PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]
CONFIG_PATH = PROJECT_ROOT / "installers" / "config.json"

with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    CONFIG = json.load(f)

TEST_CONFIG = CONFIG["tests"]
SANDBOX_PATH = PROJECT_ROOT / TEST_CONFIG["sandboxDir"]
ADAPTERS_JSON = PROJECT_ROOT / TEST_CONFIG["adaptersJson"]
PYTHON_INSTALLER = PROJECT_ROOT / TEST_CONFIG["pythonInstaller"]
NODE_INSTALLER = PROJECT_ROOT / TEST_CONFIG["nodeInstaller"]
TEST_DIR = PROJECT_ROOT / TEST_CONFIG["testDir"]
TEST_PATTERN = TEST_CONFIG["testPattern"]


# ═══════════════════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════════════════


def reset_sandbox():
    """Resets the sandbox directory for clean testing.

    Deletes the existing sandbox directory and creates a new one.
    """
    if SANDBOX_PATH.exists():
        shutil.rmtree(SANDBOX_PATH)
    SANDBOX_PATH.mkdir(parents=True, exist_ok=True)
    print(f"🧹 Sandbox reset: {SANDBOX_PATH}")


def run_cmd(cmd, cwd=None, env=None):
    """Runs a shell command and captures output.

    Args:
        cmd: List of command arguments.
        cwd: Working directory for the command.
        env: Optional environment variables dictionary.

    Returns:
        tuple: (success (bool), output (str))
    """
    cmd_env = dict(os.environ)
    if env:
        cmd_env.update(env)

    print(f"🚀 Running: {' '.join([str(c) for c in cmd])}")
    result = subprocess.run(
        cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", env=cmd_env
    )
    if result.returncode != 0:
        print(f"❌ Error: {result.stderr}")
        return False, result.stdout
    return True, result.stdout


# ═══════════════════════════════════════════════════════════════════════════
# TEST RUNNERS
# ═══════════════════════════════════════════════════════════════════════════


def test_installer(installer_type="python") -> bool:
    """Tests the specified installer against all defined adapters.

    Args:
        installer_type: The type of installer to test ('python' or 'node').

    Returns:
        bool: True if all tests passed, False otherwise.
    """
    print(f"\n--- Testing {installer_type.upper()} Installer ---")

    with open(ADAPTERS_JSON, "r", encoding="utf-8") as f:
        adapters = json.load(f)

    all_passed = True

    for env_name, config in adapters.items():
        reset_sandbox()
        print(f"📦 Testing adapter: {env_name}")

        env = None
        if installer_type == "python":
            python_path = str(PROJECT_ROOT / "installers" / "python")
            env = {"PYTHONPATH": python_path}
            cmd = [
                sys.executable,
                str(PYTHON_INSTALLER),
                "--local",
                "--env",
                env_name,
                "--yes",
            ]
        else:
            cmd = ["node", str(NODE_INSTALLER), "--local", "--env", env_name, "--yes"]

        success, output = run_cmd(cmd, cwd=str(SANDBOX_PATH), env=env)

        if not success:
            print(f"❌ {env_name} installation failed!")
            all_passed = False
            continue

        # Verification
        dest_path = SANDBOX_PATH / config["dest"]
        if not dest_path.exists():
            print(f"❌ {env_name}: Destination path {dest_path} not found!")
            all_passed = False
            continue

        files = list(dest_path.glob(f"*{config.get('ext', '.md')}"))
        if not files:
            print(f"❌ {env_name}: No files installed in {dest_path}!")
            all_passed = False
            continue

        # MDC Format check
        if config.get("format") == "mdc":
            content = files[0].read_text(encoding="utf-8")
            if "description:" not in content or "---" not in content:
                print(f"❌ {env_name}: MDC format check failed for {files[0].name}!")
                all_passed = False
                continue

        # .gitignore verification
        gitignore_path = SANDBOX_PATH / ".gitignore"
        if not gitignore_path.exists():
            print(f"❌ {env_name}: .gitignore not created!")
            all_passed = False
        else:
            gitignore_content = gitignore_path.read_text(encoding="utf-8")
            engine_dir_entry = CONFIG["engineDir"] + "/"
            dest_entry = config["dest"]
            if not dest_entry.endswith("/"):
                dest_entry += "/"

            if engine_dir_entry not in gitignore_content:
                print(
                    f"❌ {env_name}: {engine_dir_entry} entry missing from .gitignore!"
                )
                all_passed = False
            if dest_entry not in gitignore_content:
                print(f"❌ {env_name}: {dest_entry} entry missing from .gitignore!")
                all_passed = False

        print(
            f"✅ {env_name}: Successfully installed {len(files)} files & verified .gitignore."
        )

    return all_passed


def test_dev_mode(installer_type="python") -> bool:
    """Verifies that --dev flag installs development-specific files.

    Args:
        installer_type: The type of installer to test ('python' or 'node').

    Returns:
        bool: True if dev-mode check passed, False otherwise.
    """
    print(f"\n--- Testing {installer_type.upper()} DEV MODE ---")
    reset_sandbox()

    env = None
    if installer_type == "python":
        python_path = str(PROJECT_ROOT / "installers" / "python")
        env = {"PYTHONPATH": python_path}
        cmd = [
            sys.executable,
            str(PYTHON_INSTALLER),
            "--local",
            "--dev",
            "--yes",
        ]
    else:
        cmd = ["node", str(NODE_INSTALLER), "--local", "--dev", "--yes"]

    success, output = run_cmd(cmd, cwd=str(SANDBOX_PATH), env=env)

    if not success:
        print(f"❌ {installer_type} dev-mode installation failed!")
        return False

    # Check for a dev workflow (e.g., magic.dev.simulate)
    dev_wf = (
        SANDBOX_PATH
        / ".agents"
        / "workflows"
        / f"magic.dev.simulate{CONFIG['defaultExt']}"
    )
    if not dev_wf.exists():
        print(f"❌ Dev workflow missing: {dev_wf}")
        return False

    # Check for a dev engine file (e.g., simulate.md)
    dev_magic = SANDBOX_PATH / CONFIG["engineDir"] / "simulate.md"
    if not dev_magic.exists():
        print(f"❌ Dev engine file missing: {dev_magic}")
        return False

    # Check for a dev skill (e.g., magic.dev.simulate), which is a directory
    dev_skill = SANDBOX_PATH / ".agents" / "skills" / "magic.dev.simulate"
    if not dev_skill.exists() or not dev_skill.is_dir():
        print(f"❌ Dev skill missing or not a directory: {dev_skill}")
        return False

    print(
        f"✅ {installer_type} dev-mode: Verified presence of development instruments (workflows, skills, engine files)."
    )
    return True


def run_all_tests():
    """Discovers and runs all unit tests in the tests directory.

    Returns:
        bool: True if all tests passed, False otherwise.
    """
    # Discover and run all tests in the tests directory
    loader = unittest.TestLoader()
    start_dir = TEST_DIR

    # Ensure installers/python is in sys.path so tests can import magic_spec
    python_path = str(PROJECT_ROOT / "installers" / "python")
    if python_path not in sys.path:
        sys.path.insert(0, python_path)

    print(f"🔍 Discovering tests in: {start_dir}")
    suite = loader.discover(str(start_dir), pattern=TEST_PATTERN)

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    if not result.wasSuccessful():
        print("❌ Unit tests failed!")
        return False

    print("✅ Unit tests passed.")
    return True


if __name__ == "__main__":
    print("🪄 Magic-Spec Master Test Runner")

    # 1. Run standard tests (unittest API)
    unit_success = run_all_tests()

    # 2. Run exhaustive adapter tests
    print("\n--- Running Exhaustive Adapter Validation ---")
    python_success = test_installer("python")
    node_success = test_installer("node")

    # 3. Run Dev Mode tests
    print("\n--- Running Dev Mode Validation ---")
    python_dev_success = test_dev_mode("python")
    node_dev_success = test_dev_mode("node")

    if (
        unit_success
        and python_success
        and node_success
        and python_dev_success
        and node_dev_success
    ):
        print("\n🎉 All tests completed successfully!")
    else:
        print("\n⚠️  Tests completed, but there were FAILURES.")
        sys.exit(1)
