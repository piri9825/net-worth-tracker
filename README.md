# Net Worth Tracker

A full-stack web application for tracking and visualizing account values over time. Built with FastAPI backend and React frontend.

## Features

- 📊 Interactive charts with Chart.js
- 🏷️ Tag-based filtering (Asset/Liability, Short Term/Long Term)
- 📈 Aggregated and split view modes
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
│   └── schemas/           # Pydantic schemas
├── frontend/              # React frontend
│   └── src/
├── scripts/               # Data loading scripts
│   └── load_from_excel.py # Main data import script
└── Net Worth Tracker.xlsx # Your data file
```

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

Ensure your `Net Worth Tracker.xlsx` file is in the root directory. Can make your own version of `load_from_excel.py` to load data in via API.

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
- Read your Excel file directly
- Create accounts with proper tags
- Import all historical values
- Show progress and summary

### 3. Start the Frontend Server

```bash
cd frontend
npm run dev
```

The frontend will be available at: http://localhost:5173

