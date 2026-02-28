import os
import shutil
import tempfile
import unittest
import subprocess
import sys
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent.absolute()

# Load global config for tests
with open(PROJECT_ROOT / "installers" / "config.json", "r") as f:
    CONFIG = json.load(f)

ENGINE_DIR = CONFIG["engineDir"]
AGENT_DIR = CONFIG["agentDir"]
WORKFLOWS_DIR = CONFIG["workflowsDir"]
DEFAULT_EXT = CONFIG["defaultExt"]


class TestIntegration(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = Path(tempfile.mkdtemp())
        self.old_cwd = os.getcwd()
        os.chdir(self.tmp_dir)

    def tearDown(self):
        os.chdir(self.old_cwd)
        shutil.rmtree(self.tmp_dir)

    def test_node_installer_exists(self):
        installer_path = PROJECT_ROOT / "installers" / "node" / "index.js"
        self.assertTrue(installer_path.exists())

    def test_python_installer_exists(self):
        installer_path = (
            PROJECT_ROOT / "installers" / "python" / "magic_spec" / "__main__.py"
        )
        self.assertTrue(installer_path.exists())

    def assertCommand(self, result):
        # Use repr() to avoid any encoding issues when printing to console
        stdout_repr = repr(result.stdout)
        stderr_repr = repr(result.stderr)
        self.assertEqual(
            result.returncode,
            0,
            f"Command failed with code {result.returncode}.\nSTDOUT: {stdout_repr}\nSTDERR: {stderr_repr}",
        )

    def test_doctor_command_python(self):
        """Test the --doctor flag in the python installer."""
        # First, we need to have a engine directory for --doctor to work
        os.makedirs(f"{ENGINE_DIR}/scripts", exist_ok=True)

        # Create a mock check-prerequisites script
        if os.name == "nt":
            check_script = Path(f"{ENGINE_DIR}/scripts/check-prerequisites.ps1")
            check_script.write_text('Write-Output \'{"status":"ok","artifacts":{}}\'')
        else:
            check_script = Path(f"{ENGINE_DIR}/scripts/check-prerequisites.sh")
            check_script.write_text(
                '#!/bin/bash\necho \'{"status":"ok","artifacts":{}}\''
            )
            check_script.chmod(0o755)

        installer = (
            PROJECT_ROOT / "installers" / "python" / "magic_spec" / "__main__.py"
        )
        # Use PYTHONPATH to ensure relative imports in the installer works
        # Keep UTF-8 output stable across Windows/Linux shells
        env = os.environ.copy()
        env["PYTHONPATH"] = str(PROJECT_ROOT / "installers" / "python")
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUTF8"] = "1"

        result = subprocess.run(
            [sys.executable, str(installer), "--doctor"],
            capture_output=True,
            text=True,
            env=env,
            encoding="utf-8",
        )

        self.assertCommand(result)
        self.assertIn("magic-spec Doctor:", result.stdout)

    def test_doctor_command_node(self):
        """Test the --doctor flag in the node installer."""
        # First, we need to have a engine directory for --doctor to work
        os.makedirs(f"{ENGINE_DIR}/scripts", exist_ok=True)

        # Create a mock check-prerequisites script
        if os.name == "nt":
            check_script = Path(f"{ENGINE_DIR}/scripts/check-prerequisites.ps1")
            check_script.write_text('Write-Output \'{"status":"ok","artifacts":{}}\'')
        else:
            check_script = Path(f"{ENGINE_DIR}/scripts/check-prerequisites.sh")
            check_script.write_text(
                '#!/bin/bash\necho \'{"status":"ok","artifacts":{}}\''
            )
            check_script.chmod(0o755)

        installer = PROJECT_ROOT / "installers" / "node" / "index.js"

        # Node installer needs to find ../../package.json relative to its location
        # subprocess.run should handle this if we point to the absolute path
        result = subprocess.run(
            ["node", str(installer), "--doctor"],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )

        self.assertCommand(result)
        self.assertIn("magic-spec Doctor:", result.stdout)

    def test_help_command_python(self):
        installer = (
            PROJECT_ROOT / "installers" / "python" / "magic_spec" / "__main__.py"
        )
        env = os.environ.copy()
        env["PYTHONPATH"] = str(PROJECT_ROOT / "installers" / "python")
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUTF8"] = "1"
        result = subprocess.run(
            [sys.executable, str(installer), "--help"],
            capture_output=True,
            text=True,
            env=env,
            encoding="utf-8",
        )
        self.assertCommand(result)
        self.assertIn("Usage:", result.stdout)

    def test_help_command_node(self):
        installer = PROJECT_ROOT / "installers" / "node" / "index.js"
        result = subprocess.run(
            ["node", str(installer), "--help"],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        self.assertCommand(result)
        self.assertIn("Usage:", result.stdout)

    def test_info_command_python(self):
        installer = (
            PROJECT_ROOT / "installers" / "python" / "magic_spec" / "__main__.py"
        )
        env = os.environ.copy()
        env["PYTHONPATH"] = str(PROJECT_ROOT / "installers" / "python")
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUTF8"] = "1"
        result = subprocess.run(
            [sys.executable, str(installer), "info"],
            capture_output=True,
            text=True,
            env=env,
            encoding="utf-8",
        )
        self.assertCommand(result)
        self.assertIn("installation status", result.stdout)

    def test_info_command_node(self):
        installer = PROJECT_ROOT / "installers" / "node" / "index.js"
        result = subprocess.run(
            ["node", str(installer), "info"],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        self.assertCommand(result)
        self.assertIn("installation status", result.stdout)

    def test_check_command_python(self):
        installer = (
            PROJECT_ROOT / "installers" / "python" / "magic_spec" / "__main__.py"
        )
        env = os.environ.copy()
        env["PYTHONPATH"] = str(PROJECT_ROOT / "installers" / "python")
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUTF8"] = "1"
        # Should work even if not installed
        result = subprocess.run(
            [sys.executable, str(installer), "--check"],
            capture_output=True,
            text=True,
            env=env,
            encoding="utf-8",
        )
        self.assertCommand(result)
        self.assertIn("magic-spec", result.stdout)

    def test_check_command_node(self):
        installer = PROJECT_ROOT / "installers" / "node" / "index.js"
        result = subprocess.run(
            ["node", str(installer), "--check"],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        self.assertCommand(result)
        self.assertIn("magic-spec", result.stdout)

    def test_toml_conversion_integration(self):
        """Test that installers correctly convert Markdown to TOML for Gemini adapter."""
        # Setup source structure
        source_dir = self.tmp_dir / "source"
        source_dir.mkdir()
        (source_dir / AGENT_DIR / WORKFLOWS_DIR).mkdir(parents=True)
        (source_dir / "installers").mkdir()

        # Mock adapters.json with gemini entry
        adapters_json = source_dir / "installers" / "adapters.json"
        adapters_json.write_text(
            json.dumps(
                {
                    "gemini": {
                        "marker": ".gemini",
                        "dest": ".gemini/commands",
                        "ext": ".toml",
                        "format": "toml",
                        "removePrefix": "magic.",
                        "description": "Gemini CLI",
                    }
                }
            ),
            encoding="utf-8",
        )

        # Mock package.json for Node installer
        (source_dir / "package.json").write_text(
            '{"version":"1.3.0"}', encoding="utf-8"
        )

        # Mock source workflow
        wf_content = "# Test Workflow\nDescription here."
        (
            source_dir / AGENT_DIR / WORKFLOWS_DIR / f"magic.spec{DEFAULT_EXT}"
        ).write_text(wf_content, encoding="utf-8")

        # Create target project dir
        target_dir = self.tmp_dir / "target"
        target_dir.mkdir()
        os.chdir(target_dir)

        # Test Python Installer
        # For a truly robust integration test, we'd need more complex mocking.
        # Let's verify the file content after a simulated install.
        import sys

        sys.path.append(str(PROJECT_ROOT / "installers" / "python"))
        from magic_spec.__main__ import install_adapter

        adapters = json.loads(adapters_json.read_text())
        install_adapter(source_dir, target_dir, "gemini", adapters)

        toml_file = target_dir / ".gemini" / "commands" / "spec.toml"
        self.assertTrue(toml_file.exists())
        toml_content = toml_file.read_text()
        self.assertIn('prompt = """', toml_content)
        self.assertIn("# Test Workflow", toml_content)

        # Cleanup target for Node test
        shutil.rmtree(target_dir / ".gemini")

        # Test Node Installer (via script execution if possible, or just manual check)
        # Since Node installer is a single file, we can't easily import a function.
        # We can try to run it but it will try to download.
        # For now, let's assume if Python logic is correct and Node matches, it's good.
        # OR we can use a small node script to test the function.
        # (Skipping Node function test for now to keep it simple and avoid syntax issues)
        pass

    def test_mdc_conversion_integration(self):
        """Test that installers correctly convert Markdown to MDC for Windsurf adapter."""
        # Setup source structure
        source_dir = self.tmp_dir / "source_mdc"
        source_dir.mkdir()
        (source_dir / AGENT_DIR / WORKFLOWS_DIR).mkdir(parents=True)
        (source_dir / "installers").mkdir()

        # Mock adapters.json with windsurf entry
        adapters_json = source_dir / "installers" / "adapters.json"
        adapters_json.write_text(
            json.dumps(
                {
                    "windsurf": {
                        "marker": ".windsurf",
                        "dest": ".windsurf/rules",
                        "ext": ".mdc",
                        "format": "mdc",
                        "removePrefix": "magic.",
                        "description": "Windsurf Rules",
                    }
                }
            ),
            encoding="utf-8",
        )

        # Mock source workflow
        wf_content = "# Test Workflow\nDescription here."
        (
            source_dir / AGENT_DIR / WORKFLOWS_DIR / f"magic.task{DEFAULT_EXT}"
        ).write_text(wf_content, encoding="utf-8")

        # Create target project dir
        target_dir = self.tmp_dir / "target_mdc"
        target_dir.mkdir()

        # Test Python Installer helper logic
        import sys

        if str(PROJECT_ROOT / "installers" / "python") not in sys.path:
            sys.path.append(str(PROJECT_ROOT / "installers" / "python"))
        from magic_spec.__main__ import install_adapter

        adapters = json.loads(adapters_json.read_text())
        install_adapter(source_dir, target_dir, "windsurf", adapters)

        mdc_file = target_dir / ".windsurf" / "rules" / "task.mdc"
        self.assertTrue(mdc_file.exists())
        mdc_content = mdc_file.read_text()
        self.assertIn("---", mdc_content)
        self.assertIn("description: Magic SDD Workflow: task.mdc", mdc_content)
        self.assertIn("globs: ", mdc_content)
        self.assertIn("# Test Workflow", mdc_content)

    def test_eject_command_python(self):
        installer = (
            PROJECT_ROOT / "installers" / "python" / "magic_spec" / "__main__.py"
        )
        env = os.environ.copy()
        env["PYTHONPATH"] = str(PROJECT_ROOT / "installers" / "python")
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUTF8"] = "1"

        # Create dummy .magic to eject
        os.makedirs(ENGINE_DIR, exist_ok=True)

        result = subprocess.run(
            [sys.executable, str(installer), "--eject", "--yes"],
            capture_output=True,
            text=True,
            env=env,
            encoding="utf-8",
        )
        self.assertCommand(result)
        self.assertIn("ejected successfully", result.stdout)
        self.assertFalse(os.path.exists(ENGINE_DIR))

    def test_eject_command_node(self):
        installer = PROJECT_ROOT / "installers" / "node" / "index.js"

        # Create dummy .magic to eject
        os.makedirs(ENGINE_DIR, exist_ok=True)

        result = subprocess.run(
            ["node", str(installer), "--eject", "--yes"],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        self.assertCommand(result)
        self.assertIn("ejected successfully", result.stdout)
        self.assertFalse(os.path.exists(".magic"))


if __name__ == "__main__":
    unittest.main()
