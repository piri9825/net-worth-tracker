import threading

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.drive import DriveConfigError, DriveError
from app.services.importer import ExcelParseError
from app.services.sync import SyncNotConfigured, run_drive_sync

router = APIRouter()

# One sync at a time - overlapping wipe-and-reloads would corrupt the data
_sync_lock = threading.Lock()


class SyncResult(BaseModel):
    accounts_loaded: int
    values_loaded: int
    file_name: str
    drive_modified_time: str


@router.post("/", response_model=SyncResult)
def sync_from_drive(db: Session = Depends(get_db)):
    """
    Download the workbook from Google Drive and replace all accounts and
    values with its contents.
    """
    if not _sync_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="A sync is already in progress")

    try:
        outcome = run_drive_sync(db)
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
    )
