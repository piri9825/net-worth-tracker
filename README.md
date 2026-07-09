# Net Worth Tracker

A full-stack web application for tracking and visualizing account values over time. Built with FastAPI backend and React frontend.

## Features

- 📊 Interactive charts with Chart.js
- 🏷️ Structured account classification (Term, Type, Portfolio, Asset Class)
- 📈 Aggregated and split view modes
- 🔍 Advanced filtering by account attributes
- 📱 Responsive design
- 📁 Direct Excel file import
- ☁️ One-click sync from Google Drive

## Requirements

- **Python 3.13+** (managed with [uv](https://docs.astral.sh/uv/))
- **Node.js & npm** (used to build the frontend)
- **SQLite** (automatically handled)
- **Your data**: a `Net Worth Tracker` spreadsheet in Google Drive (recommended, see [Google Drive Sync Setup](#google-drive-sync-setup)) or a local `Net Worth Tracker.xlsx`

## Project Structure

```
net-worth-tracker/
├── app/                    # FastAPI backend
│   ├── api/               # API endpoints
│   ├── database/          # Database configuration
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   ├── services/          # Drive download, Excel import, sync
│   ├── cli.py             # `uv run tracker` entry point
│   ├── config.py          # .env settings
│   └── enums.py           # Account classification enums
├── frontend/              # React frontend
│   └── src/
│       ├── types/         # TypeScript type definitions
│       └── components/    # React components
├── scripts/               # Data loading scripts
│   └── load_from_excel.py # Local-file import (Drive-less fallback)
├── secrets/               # Google service account key (gitignored)
└── .env                   # DRIVE_FILE_ID etc. (gitignored)
```

## Account Data Model

Each account has the following optional classification fields:

- **Term**: `Short Term` | `Long Term` | null
- **Type**: `Asset` | `Liability` | null
- **Portfolio**: `Liquid` | `Illiquid` | null
- **Asset Class**: `Cash` | `Equities` | `Crypto` | `Real Estate` | null

All fields are nullable - accounts without specific classifications will simply omit those fields.

## Setup & Installation

```bash
uv sync
```

That's the only install step — the first `uv run tracker` installs the frontend dependencies and builds the frontend automatically. Then do the one-time [Google Drive Sync Setup](#google-drive-sync-setup) below.

### Spreadsheet Format

The workbook needs a sheet named **"Net Worth"** with the following structure (first row is headers):
- Column 0: **Description** (used to detect data rows - must not be empty)
- Column 1: **Term** (Short Term, Long Term, or empty)
- Column 2: **Type** (Asset, Liability, or empty)
- Column 3: **Portfolio** (Liquid, Illiquid, or empty)
- Column 4: **Asset Class** (Cash, Equities, Crypto, Real Estate, or empty)
- Column 5: **Account** (Account name - required)
- Column 6+: **Date columns** (dates in first row, values in data rows)

Reading stops at the first row with an empty Description field (used to separate data from summary rows). Accounts appearing in multiple rows have their values summed per date.

## Running the Application

```bash
uv run tracker
```

That's it — one command builds the frontend if needed, starts the server, syncs the latest data from Google Drive, and opens the dashboard at http://localhost:8000 (API docs at http://localhost:8000/api/docs). If Drive is unreachable or not configured, it starts with the existing data — use the sync icon in the header to re-sync any time.

Options:

```bash
uv run tracker --port 9000     # different port
uv run tracker --no-browser    # don't open the browser
uv run tracker --dev           # for frontend development: also starts the Vite
                               # dev server (http://localhost:5173) with hot
                               # reload, backend restarts on code changes
```

### Loading data without Drive

If you'd rather not use Google Drive (or need a one-off import), load a local workbook directly into the database — no server needed:

```bash
uv run python scripts/load_from_excel.py            # uses "Net Worth Tracker.xlsx"
uv run python scripts/load_from_excel.py my.xlsx    # or an explicit path
```

Like the Drive sync, this replaces all accounts and values in a single transaction — existing data is kept if anything fails.

## Google Drive Sync Setup

One-time, free setup that lets the dashboard pull the workbook straight from Google Drive — no more downloading and copying the file by hand.

### 1. Create a service account

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a project (any name, no billing needed).
2. **APIs & Services → Library** → search for **Google Drive API** → **Enable**.
3. **APIs & Services → Credentials → Create Credentials → Service account**. Give it a name (e.g. `net-worth-sync`), skip the optional role/access steps.
4. Open the new service account → **Keys → Add key → Create new key → JSON**. A key file downloads.
5. Save it in this repo as `secrets/service-account.json` (the `secrets/` directory is gitignored).

### 2. Share the workbook with the service account

In Google Drive, share `Net Worth Tracker.xlsx` with the service account's email (shown in the console, and as `client_email` inside the key file — looks like `net-worth-sync@<project>.iam.gserviceaccount.com`). **Viewer** access is enough.

### 3. Configure the file ID

Open the workbook in Drive and copy the file ID from the URL (`https://drive.google.com/file/d/<FILE_ID>/view`). Create a `.env` file in the repo root:

```bash
DRIVE_FILE_ID=<FILE_ID>
# Optional, this is the default:
# GOOGLE_SERVICE_ACCOUNT_FILE=secrets/service-account.json
```

### 4. Sync

`uv run tracker` syncs automatically on startup, and the refresh icon in the dashboard header re-syncs any time (there's also `POST /api/sync/` if you want it scripted). The workbook is downloaded from Drive, parsed, and loaded in one transaction — your typical flow becomes: edit the sheet in Drive, start (or re-sync) the app, done. Native Google Sheets work too (exported as xlsx automatically).

