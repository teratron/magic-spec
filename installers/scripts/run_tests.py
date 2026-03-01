import sys
import json
import shutil
import pathlib
import subprocess
import unittest

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")


# Config
PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]
CONFIG_PATH = PROJECT_ROOT / "installers" / "config.json"

with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    CONFIG = json.load(f)

TEST_CONFIG = CONFIG.get("tests", {})
SANDBOX_PATH = PROJECT_ROOT / TEST_CONFIG.get("sandboxDir", "installers/tests/sandbox")
ADAPTERS_JSON = PROJECT_ROOT / TEST_CONFIG.get(
    "adaptersJson", "installers/adapters.json"
)
PYTHON_INSTALLER = PROJECT_ROOT / TEST_CONFIG.get(
    "pythonInstaller", "installers/python/magic_spec/__main__.py"
)
NODE_INSTALLER = PROJECT_ROOT / TEST_CONFIG.get(
    "nodeInstaller", "installers/node/index.js"
)
TEST_DIR = PROJECT_ROOT / TEST_CONFIG.get("testDir", "installers/tests")
TEST_PATTERN = TEST_CONFIG.get("testPattern", "test_*.py")


def reset_sandbox():
    if SANDBOX_PATH.exists():
        shutil.rmtree(SANDBOX_PATH)
    SANDBOX_PATH.mkdir(parents=True, exist_ok=True)
    print(f"🧹 Sandbox reset: {SANDBOX_PATH}")


def run_cmd(cmd, cwd=None):
    print(f"🚀 Running: {' '.join([str(c) for c in cmd])}")
    result = subprocess.run(
        cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8"
    )
    if result.returncode != 0:
        print(f"❌ Error: {result.stderr}")
        return False, result.stdout
    return True, result.stdout


def test_installer(installer_type="python"):
    print(f"\n--- Testing {installer_type.upper()} Installer ---")

    with open(ADAPTERS_JSON, "r", encoding="utf-8") as f:
        adapters = json.load(f)

    for env_name, config in adapters.items():
        reset_sandbox()
        print(f"📦 Testing adapter: {env_name}")

        if installer_type == "python":
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

        success, output = run_cmd(cmd, cwd=str(SANDBOX_PATH))

        if not success:
            print(f"❌ {env_name} installation failed!")
            continue

        # Verification
        dest_path = SANDBOX_PATH / config["dest"]
        if not dest_path.exists():
            print(f"❌ {env_name}: Destination path {dest_path} not found!")
            continue

        files = list(dest_path.glob(f"*{config.get('ext', '.md')}"))
        if not files:
            print(f"❌ {env_name}: No files installed in {dest_path}!")
            continue

        # MDC Format check
        if config.get("format") == "mdc":
            content = files[0].read_text(encoding="utf-8")
            if "description:" not in content or "---" not in content:
                print(f"❌ {env_name}: MDC format check failed for {files[0].name}!")
                continue

        print(f"✅ {env_name}: Successfully installed {len(files)} files.")


def run_all_tests():
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
    test_installer("python")
    test_installer("node")

    if unit_success:
        print("\n🎉 All tests completed successfully!")
    else:
        print("\n⚠️  Tests completed, but there were UNIT TEST FAILURES.")
        sys.exit(1)
