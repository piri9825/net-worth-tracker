"""Orchestrates a full sync: Drive download -> parse -> DB reload."""

from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.account import Account
from app.models.sync_state import SyncState
from app.models.value import Value
from app.services.backup import snapshot_db
from app.services.drive import DriveClient, DriveConfigError
from app.services.importer import import_accounts, parse_workbook


class SyncNotConfigured(Exception):
    pass


@dataclass
class SyncOutcome:
    accounts_loaded: int
    values_loaded: int
    file_name: str
    drive_modified_time: str
    skipped: bool = False


def run_drive_sync(db: Session, force: bool = False) -> SyncOutcome:
    """
    Reload the DB from the Drive workbook. Skips the reload when the file
    hasn't changed since the last sync (unless force=True).
    Raises SyncNotConfigured / DriveConfigError / DriveError / ExcelParseError.
    """
    settings = get_settings()
    if not settings.drive_file_id:
        raise SyncNotConfigured(
            "Drive sync is not configured: set DRIVE_FILE_ID in .env"
        )

    client = DriveClient(settings.service_account_file)
    metadata = client.get_metadata(settings.drive_file_id)

    state = db.get(SyncState, 1)
    if (
        not force
        and state is not None
        and state.drive_modified_time == metadata.modified_time
    ):
        return SyncOutcome(
            accounts_loaded=db.query(Account).count(),
            values_loaded=db.query(Value).count(),
            file_name=metadata.name,
            drive_modified_time=metadata.modified_time,
            skipped=True,
        )

    content = client.download(settings.drive_file_id, metadata.mime_type)
    parsed = parse_workbook(BytesIO(content))

    snapshot_db()
    summary = import_accounts(db, parsed)

    db.merge(
        SyncState(
            id=1,
            file_name=metadata.name,
            drive_modified_time=metadata.modified_time,
            synced_at=datetime.now(timezone.utc),
        )
    )
    db.commit()

    return SyncOutcome(
        accounts_loaded=summary.accounts_loaded,
        values_loaded=summary.values_loaded,
        file_name=metadata.name,
        drive_modified_time=metadata.modified_time,
    )


def sync_on_startup() -> None:
    """Best-effort sync at application startup; never raises."""
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        print("Syncing from Google Drive...", flush=True)
        outcome = run_drive_sync(db)
        if outcome.skipped:
            print(
                f"Startup sync: '{outcome.file_name}' unchanged since last sync",
                flush=True,
            )
        else:
            print(
                f"Startup sync: {outcome.accounts_loaded} accounts, "
                f"{outcome.values_loaded} values from '{outcome.file_name}'",
                flush=True,
            )
    except (SyncNotConfigured, DriveConfigError) as e:
        print(f"Skipping startup sync - {e}", flush=True)
    except Exception as e:
        print(f"Startup sync failed ({e}) - serving existing data", flush=True)
    finally:
        db.close()
