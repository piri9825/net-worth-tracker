"""
Download the tracker workbook from Google Drive using a service account.

The service account's JSON key file must exist locally and the Drive file
must be shared (Viewer is enough) with the service account's email address.
"""

import json
from dataclasses import dataclass
from pathlib import Path

import requests
from google.auth.transport.requests import Request
from google.oauth2 import service_account

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files"
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet"
TIMEOUT_SECONDS = 30


class DriveConfigError(Exception):
    """Local configuration problem (missing or invalid service account key)."""


class DriveError(Exception):
    """Google Drive could not be reached or refused the request."""


@dataclass
class DriveFile:
    name: str
    modified_time: str
    content: bytes


def _load_credentials(service_account_file: Path) -> service_account.Credentials:
    if not service_account_file.exists():
        raise DriveConfigError(
            f"Service account key file not found: {service_account_file}"
        )
    try:
        return service_account.Credentials.from_service_account_file(
            str(service_account_file), scopes=SCOPES
        )
    except (ValueError, json.JSONDecodeError) as e:
        raise DriveConfigError(
            f"Invalid service account key file {service_account_file}: {e}"
        ) from e


def download_drive_file(file_id: str, service_account_file: Path) -> DriveFile:
    """
    Fetch the file's metadata and content from Google Drive.
    Native Google Sheets are exported as xlsx; regular files are downloaded as-is.
    """
    credentials = _load_credentials(service_account_file)
    try:
        credentials.refresh(Request())
    except Exception as e:
        raise DriveError(f"Could not authenticate with Google: {e}") from e

    headers = {"Authorization": f"Bearer {credentials.token}"}

    def _get(url: str, **kwargs) -> requests.Response:
        try:
            response = requests.get(
                url, headers=headers, timeout=TIMEOUT_SECONDS, **kwargs
            )
        except requests.RequestException as e:
            raise DriveError(f"Could not reach Google Drive: {e}") from e
        if response.status_code in (403, 404):
            raise DriveError(
                f"Drive file '{file_id}' not found or not shared with the "
                f"service account ({credentials.service_account_email})"
            )
        if response.status_code != 200:
            raise DriveError(
                f"Google Drive returned {response.status_code}: {response.text[:200]}"
            )
        return response

    metadata = _get(
        f"{DRIVE_FILES_URL}/{file_id}",
        params={"fields": "name,mimeType,modifiedTime"},
    ).json()

    if metadata.get("mimeType") == GOOGLE_SHEET_MIME:
        content = _get(
            f"{DRIVE_FILES_URL}/{file_id}/export", params={"mimeType": XLSX_MIME}
        ).content
    else:
        content = _get(f"{DRIVE_FILES_URL}/{file_id}", params={"alt": "media"}).content

    return DriveFile(
        name=metadata.get("name", file_id),
        modified_time=metadata.get("modifiedTime", ""),
        content=content,
    )
