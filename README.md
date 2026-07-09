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

- **Python 3.13+**
- **Node.js & npm** (for frontend)
- **SQLite** (automatically handled)
- **Excel file**: `Net Worth Tracker.xlsx` with your data

## Project Structure

```
net-worth-tracker/
├── app/                    # FastAPI backend
│   ├── api/               # API endpoints
│   ├── database/          # Database configuration
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   └── enums.py           # Account classification enums
├── frontend/              # React frontend
│   └── src/
│       ├── types/         # TypeScript type definitions
│       └── components/    # React components
├── scripts/               # Data loading scripts
│   └── load_from_excel.py # Main data import script
└── Net Worth Tracker.xlsx # Your data file
```

## Account Data Model

Each account has the following optional classification fields:

- **Term**: `Short Term` | `Long Term` | null
- **Type**: `Asset` | `Liability` | null
- **Portfolio**: `Liquid` | `Illiquid` | null
- **Asset Class**: `Cash` | `Equities` | `Crypto` | `Real Estate` | null

All fields are nullable - accounts without specific classifications will simply omit those fields.

## Setup & Installation

### 1. Backend Setup (Python/FastAPI)

```bash
# Install Python dependencies
uv venv --python 3.13
uv sync
```

### 2. Frontend Setup (React/TypeScript)

```bash
cd frontend
npm install
```

### 3. Data Preparation

Prepare your `Net Worth Tracker.xlsx` file in the root directory with the following structure:

**Excel Format (first row is headers):**
- Column 0: **Description** (used to detect data rows - must not be empty)
- Column 1: **Term** (Short Term, Long Term, or empty)
- Column 2: **Type** (Asset, Liability, or empty)
- Column 3: **Portfolio** (Liquid, Illiquid, or empty)
- Column 4: **Asset Class** (Cash, Equities, Crypto, Real Estate, or empty)
- Column 5: **Account** (Account name - required)
- Column 6+: **Date columns** (dates in first row, values in data rows)

The script stops reading when it encounters a row with an empty Description field (used to separate data from summary rows).

## Running the Application

```bash
uv run tracker
```

That's it — one command builds the frontend if needed, starts the server, and opens the dashboard at http://localhost:8000 (API docs at http://localhost:8000/api/docs). Load fresh data by clicking the sync icon in the header.

Options:

```bash
uv run tracker --port 9000     # different port
uv run tracker --no-browser    # don't open the browser
uv run tracker --dev           # for frontend development: also starts the Vite
                               # dev server (http://localhost:5173) with hot
                               # reload, backend restarts on code changes
```

<details>
<summary>Running the servers manually instead</summary>

### 1. Start the Backend Server

```bash
# From the root directory
uv run uvicorn app.main:app --reload --port 8000
```

The API will be available at: http://localhost:8000
- API docs: http://localhost:8000/api/docs

### 2. Load Data

**Option A — Sync from Google Drive (recommended):** click the refresh icon in the dashboard header. Requires the one-time [Google Drive setup](#google-drive-sync-setup) below.

**Option B — Load a local file:**

```bash
# Import your data (clears existing data and loads fresh)
uv run python scripts/load_from_excel.py            # uses "Net Worth Tracker.xlsx"
uv run python scripts/load_from_excel.py my.xlsx    # or an explicit path
```

The script writes directly to the database (the API server does not need to be running). Both options:
- Replace all existing accounts and values in a single transaction (existing data is kept if anything fails)
- Read the "Net Worth" sheet using the header row
- Create accounts with structured classifications (Term, Type, Portfolio, Asset Class)
- Aggregate values for accounts that appear in multiple rows
- Import all historical values

### 3. Start the Frontend Server

```bash
cd frontend
npm run dev
```

The frontend will be available at: http://localhost:5173

</details>

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

With the backend running, click the refresh icon in the dashboard header (or `curl -X POST http://localhost:8000/api/sync/`). The workbook is downloaded from Drive, parsed, and loaded in one transaction — your typical flow becomes: edit the sheet in Drive, click sync, done. Native Google Sheets work too (exported as xlsx automatically).

