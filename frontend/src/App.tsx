import { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { TrendingUp, PieChart, Sun, Moon, RefreshCw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useTheme } from './contexts/theme';
import { syncApi, type SyncStatus } from './services/api';
import NetWorth from './pages/NetWorth';
import PortfolioBreakdown from './pages/PortfolioBreakdown';

// Backend datetimes are UTC but serialized without a timezone suffix
function parseUtc(value: string): Date {
  return new Date(/Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
}

function formatStatus(status: SyncStatus): string | null {
  const parts: string[] = [];
  if (status.latest_value_date) {
    const asOf = parseUtc(status.latest_value_date);
    parts.push(`Data to ${asOf.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`);
  }
  if (status.last_synced_at) {
    const synced = parseUtc(status.last_synced_at);
    const sameDay = synced.toDateString() === new Date().toDateString();
    parts.push(
      `synced ${
        sameDay
          ? synced.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
          : synced.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
      }`
    );
  }
  return parts.length ? parts.join(' · ') : null;
}

function SyncButton({ onSynced }: { onSynced: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    syncApi.status().then(setStatus).catch(console.error);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    clearTimeout(clearTimer.current);
    try {
      const result = await syncApi.run();
      setMessage({
        text: result.skipped
          ? 'Already up to date'
          : `Synced ${result.accounts_loaded} accounts, ${result.values_loaded} values`,
        error: false,
      });
      clearTimer.current = setTimeout(() => setMessage(null), 4000);
      syncApi.status().then(setStatus).catch(console.error);
      onSynced();
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Sync failed', error: true });
    } finally {
      setSyncing(false);
    }
  };

  const statusText = status ? formatStatus(status) : null;

  return (
    <div className="flex items-center gap-2">
      {message ? (
        <span
          className={`text-xs ${message.error ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {message.text}
        </span>
      ) : (
        statusText && <span className="text-xs text-muted-foreground">{statusText}</span>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleSync}
        disabled={syncing}
        aria-label="Sync from Google Drive"
        title="Sync from Google Drive"
      >
        <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}

function Navigation({ onSynced }: { onSynced: () => void }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="bg-background border-b border-border sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center h-14 gap-8">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm tracking-tight">Net Worth Tracker</span>
          </div>
          <Separator orientation="vertical" className="h-5" />
          <nav className="flex items-center gap-1 flex-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`
              }
            >
              <TrendingUp className="h-4 w-4" />
              Net Worth
            </NavLink>
            <NavLink
              to="/portfolio"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`
              }
            >
              <PieChart className="h-4 w-4" />
              Portfolio Breakdown
            </NavLink>
          </nav>
          <SyncButton onSynced={onSynced} />
          <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}

function App() {
  const [syncVersion, setSyncVersion] = useState(0);

  return (
    <Router>
      <div className="min-h-screen bg-muted/30">
        <Navigation onSynced={() => setSyncVersion((v) => v + 1)} />
        <main className="max-w-7xl mx-auto px-6 py-6">
          <Routes key={syncVersion}>
            <Route path="/" element={<NetWorth />} />
            <Route path="/portfolio" element={<PortfolioBreakdown />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
