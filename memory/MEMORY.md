# Net Worth Tracker - Project Memory

## Stack
- **Backend**: FastAPI (Python), SQLAlchemy, SQLite, uv for package management
- **Frontend**: React 19 + TypeScript, Vite 7, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui (Base UI variant)

## Frontend Architecture
- `frontend/src/App.tsx` — Router + sticky nav header (NavLink-based, no Tabs component)
- `frontend/src/pages/NetWorth.tsx` — "/" — line chart, account selector with term/type filters
- `frontend/src/pages/PortfolioBreakdown.tsx` — "/portfolio" — stacked bar chart by asset class
- `frontend/src/services/api.ts` — native fetch wrapper (no axios)
- `frontend/src/types/api.ts` — shared TS types: Account, Value, ViewMode, etc.
- `frontend/src/components/ui/` — shadcn/ui components

## Key Technical Notes
- **No axios** — uses native `fetch` via `apiFetch` helper in `services/api.ts`
- **Tailwind v4** setup: `@import "tailwindcss"` in index.css, plugin in vite.config.ts (no tailwind.config.js)
- **shadcn/ui** uses Base UI (`@base-ui/react`) not Radix UI — ToggleGroup value is always `string[]`, not `string`
- **Path alias**: `@/*` maps to `src/*` (set in both tsconfig.app.json and vite.config.ts)
- **shadcn/ui init**: run from `frontend/` directory with `npx shadcn@latest init -d`

## Backend
- FastAPI app at `app/main.py`, API prefix `/api`
- Endpoints: `/api/accounts/`, `/api/values/`, `/api/values/account/{name}`
- DB: SQLite via SQLAlchemy

## Account Data Model
- `Account`: name, description, term (Short/Long Term), type (Asset/Liability), portfolio (Liquid/Illiquid/Cash Reserves), asset_class (Cash/Equities/Crypto/Real Estate)
- `Value`: id, account_name, amount, date
