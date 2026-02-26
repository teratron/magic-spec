import os
import shutil
import tempfile
import unittest
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent.absolute()


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
        # First, we need to have a .magic directory for --doctor to work
        os.makedirs(".magic/scripts", exist_ok=True)

        # Create a mock check-prerequisites script
        if os.name == "nt":
            check_script = Path(".magic/scripts/check-prerequisites.ps1")
            check_script.write_text('Write-Output \'{"status":"ok","artifacts":{}}\'')
        else:
            check_script = Path(".magic/scripts/check-prerequisites.sh")
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
        # First, we need to have a .magic directory for --doctor to work
        os.makedirs(".magic/scripts", exist_ok=True)

        # Create a mock check-prerequisites script
        if os.name == "nt":
            check_script = Path(".magic/scripts/check-prerequisites.ps1")
            check_script.write_text('Write-Output \'{"status":"ok","artifacts":{}}\'')
        else:
            check_script = Path(".magic/scripts/check-prerequisites.sh")
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

    def test_eject_command_python(self):
        installer = (
            PROJECT_ROOT / "installers" / "python" / "magic_spec" / "__main__.py"
        )
        env = os.environ.copy()
        env["PYTHONPATH"] = str(PROJECT_ROOT / "installers" / "python")
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUTF8"] = "1"

        # Create dummy .magic to eject
        os.makedirs(".magic", exist_ok=True)

        result = subprocess.run(
            [sys.executable, str(installer), "--eject", "--yes"],
            capture_output=True,
            text=True,
            env=env,
            encoding="utf-8",
        )
        self.assertCommand(result)
        self.assertIn("ejected successfully", result.stdout)
        self.assertFalse(os.path.exists(".magic"))

    def test_eject_command_node(self):
        installer = PROJECT_ROOT / "installers" / "node" / "index.js"

        # Create dummy .magic to eject
        os.makedirs(".magic", exist_ok=True)

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
