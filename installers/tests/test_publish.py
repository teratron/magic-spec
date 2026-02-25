import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

# Add scripts directory to path to import publish
sys.path.append(str(Path(__file__).parent.parent / "scripts"))
import publish  # noqa: E402


class TestPublish(unittest.TestCase):
    def test_update_python_version_updates_expected_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            pyproject_path = root / "pyproject.toml"
            init_path = root / "installers" / "python" / "magic_spec" / "__init__.py"

            init_path.parent.mkdir(parents=True, exist_ok=True)

            pyproject_path.write_text(
                '[project]\nname = "magic-spec"\nversion = "1.2.3"\n',
                encoding="utf-8",
            )
            init_path.write_text('__version__ = "1.2.3"\n', encoding="utf-8")

            with patch.object(publish, "PROJECT_ROOT", root):
                publish.update_python_version("1.2.4")

            self.assertIn(
                'version = "1.2.4"', pyproject_path.read_text(encoding="utf-8")
            )
            self.assertIn(
                '__version__ = "1.2.4"', init_path.read_text(encoding="utf-8")
            )

    def test_update_node_version_updates_package_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            package_json_path = root / "package.json"
            package_json_path.write_text(
                '{\n  "name": "magic-spec",\n  "version": "1.2.3"\n}\n',
                encoding="utf-8",
            )

            with patch.object(publish, "PROJECT_ROOT", root):
                publish.update_node_version("1.2.4")

            self.assertIn(
                '"version": "1.2.4"', package_json_path.read_text(encoding="utf-8")
            )


if __name__ == "__main__":
    unittest.main()
