import threading
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.services.drive import DriveConfigError, DriveError, download_drive_file
from app.services.importer import ExcelParseError, import_accounts, parse_workbook

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
    settings = get_settings()
    if not settings.drive_file_id:
        raise HTTPException(
            status_code=503,
            detail="Drive sync is not configured: set DRIVE_FILE_ID in .env",
        )

    if not _sync_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="A sync is already in progress")

    try:
        try:
            drive_file = download_drive_file(
                settings.drive_file_id, settings.service_account_file
            )
        except DriveConfigError as e:
            raise HTTPException(status_code=503, detail=str(e))
        except DriveError as e:
            raise HTTPException(status_code=502, detail=str(e))

        try:
            parsed = parse_workbook(BytesIO(drive_file.content))
        except ExcelParseError as e:
            raise HTTPException(status_code=422, detail=str(e))

        summary = import_accounts(db, parsed)

        return SyncResult(
            accounts_loaded=summary.accounts_loaded,
            values_loaded=summary.values_loaded,
            file_name=drive_file.name,
            drive_modified_time=drive_file.modified_time,
        )
    finally:
        _sync_lock.release()
