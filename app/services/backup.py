"""Snapshot the SQLite database before destructive imports."""

import sqlite3
import time
from pathlib import Path

from app.database.database import SQLALCHEMY_DATABASE_URL

DB_PATH = Path(SQLALCHEMY_DATABASE_URL.removeprefix("sqlite:///"))
BACKUP_DIR = Path("backups")


def snapshot_db(keep: int = 10) -> Path | None:
    """Copy the database to backups/, pruning to the newest `keep` files.
    Returns the snapshot path, or None if there is no database yet."""
    if not DB_PATH.exists():
        return None

    BACKUP_DIR.mkdir(exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    dest = BACKUP_DIR / f"{DB_PATH.stem}-{stamp}.db"

    # sqlite3's backup API is safe even if the app has the DB open
    source = sqlite3.connect(DB_PATH)
    try:
        target = sqlite3.connect(dest)
        try:
            source.backup(target)
        finally:
            target.close()
    finally:
        source.close()

    snapshots = sorted(BACKUP_DIR.glob(f"{DB_PATH.stem}-*.db"))
    for old in snapshots[:-keep]:
        old.unlink()

    return dest
