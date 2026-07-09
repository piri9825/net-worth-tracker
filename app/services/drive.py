"""
Google Drive access via a service account.

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
class DriveMetadata:
    name: str
    mime_type: str
    modified_time: str


class DriveClient:
    """Authenticates once, then fetches metadata and content separately."""

    def __init__(self, service_account_file: Path):
        if not service_account_file.exists():
            raise DriveConfigError(
                f"Service account key file not found: {service_account_file}"
            )
        try:
            self._credentials = service_account.Credentials.from_service_account_file(
                str(service_account_file), scopes=SCOPES
            )
        except (ValueError, json.JSONDecodeError) as e:
            raise DriveConfigError(
                f"Invalid service account key file {service_account_file}: {e}"
            ) from e
        try:
            self._credentials.refresh(Request())
        except Exception as e:
            raise DriveError(f"Could not authenticate with Google: {e}") from e

    def _get(self, url: str, file_id: str, **kwargs) -> requests.Response:
        headers = {"Authorization": f"Bearer {self._credentials.token}"}
        try:
            response = requests.get(
                url, headers=headers, timeout=TIMEOUT_SECONDS, **kwargs
            )
        except requests.RequestException as e:
            raise DriveError(f"Could not reach Google Drive: {e}") from e
        if response.status_code in (403, 404):
            raise DriveError(
                f"Drive file '{file_id}' not found or not shared with the "
                f"service account ({self._credentials.service_account_email})"
            )
        if response.status_code != 200:
            raise DriveError(
                f"Google Drive returned {response.status_code}: {response.text[:200]}"
            )
        return response

    def get_metadata(self, file_id: str) -> DriveMetadata:
        data = self._get(
            f"{DRIVE_FILES_URL}/{file_id}",
            file_id,
            params={"fields": "name,mimeType,modifiedTime"},
        ).json()
        return DriveMetadata(
            name=data.get("name", file_id),
            mime_type=data.get("mimeType", ""),
            modified_time=data.get("modifiedTime", ""),
        )

    def download(self, file_id: str, mime_type: str) -> bytes:
        """Download file content; native Google Sheets are exported as xlsx."""
        if mime_type == GOOGLE_SHEET_MIME:
            return self._get(
                f"{DRIVE_FILES_URL}/{file_id}/export",
                file_id,
                params={"mimeType": XLSX_MIME},
            ).content
        return self._get(
            f"{DRIVE_FILES_URL}/{file_id}", file_id, params={"alt": "media"}
        ).content
