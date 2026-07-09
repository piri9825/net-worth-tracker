"""
Load a local Net Worth Tracker workbook straight into the database.

Writes to SQLite directly - the API server does not need to be running.
Run from the repo root so the relative database path resolves:

    uv run python scripts/load_from_excel.py [path/to/workbook.xlsx]
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal, init_db  # noqa: E402
from app.services.backup import snapshot_db  # noqa: E402
from app.services.importer import (  # noqa: E402
    ExcelParseError,
    import_accounts,
    parse_workbook,
)


def main():
    parser = argparse.ArgumentParser(
        description="Replace all accounts and values with the contents of an Excel workbook"
    )
    parser.add_argument(
        "xlsx_file",
        nargs="?",
        default="Net Worth Tracker.xlsx",
        help='Path to the workbook (default: "Net Worth Tracker.xlsx")',
    )
    args = parser.parse_args()

    if not Path(args.xlsx_file).exists():
        sys.exit(f"File not found: {args.xlsx_file}")

    init_db()

    try:
        parsed = parse_workbook(args.xlsx_file)
    except ExcelParseError as e:
        sys.exit(f"Parse error: {e}")

    snapshot_db()

    db = SessionLocal()
    try:
        summary = import_accounts(db, parsed)
    finally:
        db.close()

    print(f"✓ Accounts loaded: {summary.accounts_loaded}")
    print(f"✓ Values loaded: {summary.values_loaded}")


if __name__ == "__main__":
    main()
