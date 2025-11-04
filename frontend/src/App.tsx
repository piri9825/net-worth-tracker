import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import NetWorth from './pages/NetWorth';
import PortfolioBreakdown from './pages/PortfolioBreakdown';

function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-sm mb-0">
      <div className="container mx-auto px-4">
        <div className="flex gap-3 pt-3">
          <Link
            to="/"
            className={`px-6 py-3 font-medium transition-all rounded-t-md ${
              isActive('/')
                ? 'bg-gray-100 text-gray-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border-b-2 border-gray-100'
                : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm border-b-2 border-transparent'
            }`}
          >
            Net Worth
          </Link>
          <Link
            to="/portfolio"
            className={`px-6 py-3 font-medium transition-all rounded-t-md ${
              isActive('/portfolio')
                ? 'bg-gray-100 text-gray-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border-b-2 border-gray-100'
                : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm border-b-2 border-transparent'
            }`}
          >
            Portfolio Breakdown
          </Link>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-blue-50">
        <Navigation />
        <Routes>
          <Route path="/" element={<NetWorth />} />
          <Route path="/portfolio" element={<PortfolioBreakdown />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
