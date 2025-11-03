import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import NetWorth from './pages/NetWorth';
import PortfolioBreakdown from './pages/PortfolioBreakdown';

function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-md mb-0">
      <div className="container mx-auto px-4">
        <div className="flex space-x-1">
          <Link
            to="/"
            className={`px-6 py-4 font-medium transition-colors border-b-2 ${
              isActive('/')
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Net Worth
          </Link>
          <Link
            to="/portfolio"
            className={`px-6 py-4 font-medium transition-colors border-b-2 ${
              isActive('/portfolio')
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
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
