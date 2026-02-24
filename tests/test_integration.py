import os
import shutil
import tempfile
import unittest
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.absolute()


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

    def test_doctor_command_python(self):
        """Test the --doctor flag in the python installer."""
        # First, we need to have a .magic directory for --doctor to work
        os.makedirs(".magic/scripts", exist_ok=True)

        # Create a mock check-prerequisites script
        if os.name == "nt":
            check_script = Path(".magic/scripts/check-prerequisites.ps1")
            check_script.write_text("Write-Output '{\"status\":\"ok\",\"artifacts\":{}}'")
        else:
            check_script = Path(".magic/scripts/check-prerequisites.sh")
            check_script.write_text(
                "#!/bin/bash\necho '{\"status\":\"ok\",\"artifacts\":{}}'"
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

        result = subprocess.run(
            [sys.executable, str(installer), "--doctor"],
            capture_output=True,
            text=True,
            env=env,
            encoding="utf-8",
        )

        # Should see "Magic-spec Doctor:" in output
        self.assertEqual(
            result.returncode,
            0,
            f"Installer failed with code {result.returncode}. Error: {result.stderr}",
        )
        self.assertIn("Magic-spec Doctor:", result.stdout)

    def test_doctor_command_node(self):
        """Test the --doctor flag in the node installer."""
        # First, we need to have a .magic directory for --doctor to work
        os.makedirs(".magic/scripts", exist_ok=True)

        # Create a mock check-prerequisites script
        if os.name == "nt":
            check_script = Path(".magic/scripts/check-prerequisites.ps1")
            check_script.write_text("Write-Output '{\"status\":\"ok\",\"artifacts\":{}}'")
        else:
            check_script = Path(".magic/scripts/check-prerequisites.sh")
            check_script.write_text(
                "#!/bin/bash\necho '{\"status\":\"ok\",\"artifacts\":{}}'"
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

        self.assertEqual(
            result.returncode,
            0,
            f"Node Installer failed with code {result.returncode}. Error: {result.stderr}",
        )
        self.assertIn("Magic-spec Doctor:", result.stdout)


if __name__ == "__main__":
    unittest.main()
