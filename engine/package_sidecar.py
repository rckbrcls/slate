from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> None:
    engine_root = Path(__file__).resolve().parent
    subprocess.run(
        [
            sys.executable,
            "-m",
            "PyInstaller",
            "--noconfirm",
            "--clean",
            "--onefile",
            "--name",
            "slate-engine",
            "--paths",
            str(engine_root / "src"),
            "--collect-all",
            "docling",
            "--add-data",
            f"{engine_root / 'migrations'}:migrations",
            str(engine_root / "sidecar_entry.py"),
        ],
        cwd=engine_root,
        check=True,
    )


if __name__ == "__main__":
    main()
