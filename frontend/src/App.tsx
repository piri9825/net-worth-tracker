import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { TrendingUp, PieChart, Sun, Moon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useTheme } from './contexts/theme';
import NetWorth from './pages/NetWorth';
import PortfolioBreakdown from './pages/PortfolioBreakdown';

function Navigation() {
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
          <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-muted/30">
        <Navigation />
        <main className="max-w-7xl mx-auto px-6 py-6">
          <Routes>
            <Route path="/" element={<NetWorth />} />
            <Route path="/portfolio" element={<PortfolioBreakdown />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
