import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    drive_file_id: str | None
    service_account_file: Path


def get_settings() -> Settings:
    return Settings(
        drive_file_id=os.environ.get("DRIVE_FILE_ID") or None,
        service_account_file=Path(
            os.environ.get(
                "GOOGLE_SERVICE_ACCOUNT_FILE", "secrets/service-account.json"
            )
        ),
    )
