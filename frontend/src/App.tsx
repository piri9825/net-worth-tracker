import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import NetWorth from './pages/NetWorth';
import PortfolioBreakdown from './pages/PortfolioBreakdown';

function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-md mb-0">
      <div className="container mx-auto px-4">
        <div className="flex space-x-4 border-b border-gray-200">
          <Link
            to="/"
            className={`px-6 py-4 font-medium transition-all rounded-t-lg ${
              isActive('/')
                ? 'text-white bg-blue-600 shadow-lg'
                : 'text-gray-600 bg-transparent hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            Net Worth
          </Link>
          <Link
            to="/portfolio"
            className={`px-6 py-4 font-medium transition-all rounded-t-lg ${
              isActive('/portfolio')
                ? 'text-white bg-blue-600 shadow-lg'
                : 'text-gray-600 bg-transparent hover:text-blue-600 hover:bg-blue-50'
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
