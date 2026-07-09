import threading
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sync_state import SyncState
from app.models.value import Value
from app.services.drive import DriveConfigError, DriveError
from app.services.importer import ExcelParseError
from app.services.sync import SyncNotConfigured, run_drive_sync

router = APIRouter()

# One sync at a time - overlapping wipe-and-reloads would corrupt the data
_sync_lock = threading.Lock()


class SyncStatus(BaseModel):
    file_name: str | None
    last_synced_at: datetime | None
    latest_value_date: datetime | None


@router.get("/status", response_model=SyncStatus)
def sync_status(db: Session = Depends(get_db)):
    """When the data was last synced and how recent it is."""
    state = db.get(SyncState, 1)
    latest_value_date = db.query(func.max(Value.date)).scalar()
    return SyncStatus(
        file_name=state.file_name if state else None,
        last_synced_at=state.synced_at if state else None,
        latest_value_date=latest_value_date,
    )


class SyncResult(BaseModel):
    accounts_loaded: int
    values_loaded: int
    file_name: str
    drive_modified_time: str
    skipped: bool


@router.post("/", response_model=SyncResult)
def sync_from_drive(force: bool = False, db: Session = Depends(get_db)):
    """
    Download the workbook from Google Drive and replace all accounts and
    values with its contents. Skipped when the file hasn't changed since
    the last sync, unless force=true.
    """
    if not _sync_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="A sync is already in progress")

    try:
        outcome = run_drive_sync(db, force=force)
    except (SyncNotConfigured, DriveConfigError) as e:
        raise HTTPException(status_code=503, detail=str(e))
    except DriveError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except ExcelParseError as e:
        raise HTTPException(status_code=422, detail=str(e))
    finally:
        _sync_lock.release()

    return SyncResult(
        accounts_loaded=outcome.accounts_loaded,
        values_loaded=outcome.values_loaded,
        file_name=outcome.file_name,
        drive_modified_time=outcome.drive_modified_time,
        skipped=outcome.skipped,
    )
