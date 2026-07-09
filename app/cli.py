"""
`uv run tracker` - start the whole app with one command.

Default mode serves the built frontend and the API from a single uvicorn
process, rebuilding the frontend first if the source has changed. Pass
--dev to also start the Vite dev server (hot reload) alongside a
reloading backend.
"""

import argparse
import os
import shutil
import subprocess
import sys
import threading
import webbrowser
from pathlib import Path

import uvicorn

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"
DIST_INDEX = FRONTEND / "dist" / "index.html"


def _frontend_is_stale() -> bool:
    if not DIST_INDEX.exists():
        return True
    built_at = DIST_INDEX.stat().st_mtime
    sources = [
        FRONTEND / "package.json",
        FRONTEND / "vite.config.ts",
        FRONTEND / "index.html",
        *(FRONTEND / "src").rglob("*"),
    ]
    return any(
        p.is_file() and p.stat().st_mtime > built_at for p in sources if p.exists()
    )


def _npm() -> str:
    npm = shutil.which("npm")
    if not npm:
        sys.exit("npm not found - install Node.js to build/run the frontend")
    return npm


def _build_frontend():
    if not (FRONTEND / "node_modules").is_dir():
        print("Installing frontend dependencies...")
        subprocess.run([_npm(), "install"], cwd=FRONTEND, check=True)
    print("Building frontend...")
    subprocess.run([_npm(), "run", "build"], cwd=FRONTEND, check=True)


def _open_browser_soon(url: str):
    threading.Timer(1.5, webbrowser.open, [url]).start()


def main():
    parser = argparse.ArgumentParser(description="Start the Net Worth Tracker")
    parser.add_argument("--port", type=int, default=8000, help="backend port")
    parser.add_argument(
        "--dev",
        action="store_true",
        help="also start the Vite dev server with hot reload",
    )
    parser.add_argument(
        "--no-browser", action="store_true", help="don't open the dashboard"
    )
    args = parser.parse_args()

    # The SQLite path and .env are relative to the repo root
    os.chdir(ROOT)

    if args.dev:
        vite = subprocess.Popen([_npm(), "run", "dev"], cwd=FRONTEND)
        if not args.no_browser:
            _open_browser_soon("http://localhost:5173")
        try:
            uvicorn.run("app.main:app", port=args.port, reload=True)
        finally:
            vite.terminate()
            vite.wait()
        return

    if _frontend_is_stale():
        _build_frontend()
    if not args.no_browser:
        _open_browser_soon(f"http://localhost:{args.port}")
    print(f"Dashboard: http://localhost:{args.port}")
    uvicorn.run("app.main:app", port=args.port)


if __name__ == "__main__":
    main()
