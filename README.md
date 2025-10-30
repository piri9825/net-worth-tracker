# Net Worth Tracker

A full-stack web application for tracking and visualizing account values over time. Built with FastAPI backend and React frontend.

## Features

- 📊 Interactive charts with Chart.js
- 🏷️ Structured account classification (Term, Type, Portfolio, Asset Class)
- 📈 Aggregated and split view modes
- 🔍 Advanced filtering by account attributes
- 📱 Responsive design
- 📁 Direct Excel file import

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

### 1. Start the Backend Server

```bash
# From the root directory
uv run uvicorn app.main:app --reload --port 8000
```

The API will be available at: http://localhost:8000
- API docs: http://localhost:8000/docs

### 2. Load Data from Excel

```bash
# Import your data (clears existing data and loads fresh)
uv run python scripts/load_from_excel.py
```

This script will:
- Clear any existing accounts and values
- Read your Excel file using the header row
- Create accounts with structured classifications (Term, Type, Portfolio, Asset Class)
- Aggregate values for accounts that appear in multiple rows
- Import all historical values
- Show progress and summary statistics

### 3. Start the Frontend Server

```bash
cd frontend
npm run dev
```

The frontend will be available at: http://localhost:5173

