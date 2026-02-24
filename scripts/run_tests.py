import sys
import unittest
from pathlib import Path


def run_all_tests():
    # Discover and run all tests in the tests directory
    loader = unittest.TestLoader()
    # Looking for tests in the /tests directory relative to this script
    start_dir = Path(__file__).parent.parent / "tests"

    print(f"Discovering tests in: {start_dir}")
    suite = loader.discover(str(start_dir), pattern="test_*.py")

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    if not result.wasSuccessful():
        sys.exit(1)


if __name__ == "__main__":
    run_all_tests()
