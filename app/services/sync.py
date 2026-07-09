"""Orchestrates a full sync: Drive download -> parse -> DB reload."""

from dataclasses import dataclass
from io import BytesIO

from sqlalchemy.orm import Session

from app.config import get_settings
from app.services.drive import DriveConfigError, download_drive_file
from app.services.importer import import_accounts, parse_workbook


class SyncNotConfigured(Exception):
    pass


@dataclass
class SyncOutcome:
    accounts_loaded: int
    values_loaded: int
    file_name: str
    drive_modified_time: str


def run_drive_sync(db: Session) -> SyncOutcome:
    """
    Download the workbook from Drive and replace all accounts and values.
    Raises SyncNotConfigured / DriveConfigError / DriveError / ExcelParseError.
    """
    settings = get_settings()
    if not settings.drive_file_id:
        raise SyncNotConfigured(
            "Drive sync is not configured: set DRIVE_FILE_ID in .env"
        )

    drive_file = download_drive_file(
        settings.drive_file_id, settings.service_account_file
    )
    parsed = parse_workbook(BytesIO(drive_file.content))
    summary = import_accounts(db, parsed)

    return SyncOutcome(
        accounts_loaded=summary.accounts_loaded,
        values_loaded=summary.values_loaded,
        file_name=drive_file.name,
        drive_modified_time=drive_file.modified_time,
    )


def sync_on_startup() -> None:
    """Best-effort sync at application startup; never raises."""
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        print("Syncing from Google Drive...", flush=True)
        outcome = run_drive_sync(db)
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
