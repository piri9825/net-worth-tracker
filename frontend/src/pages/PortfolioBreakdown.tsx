import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { Account, Value, Portfolio, AssetClass } from '../types/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function PortfolioBreakdown() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedPortfolios, setSelectedPortfolios] = useState<Portfolio[]>(['Liquid', 'Illiquid', 'Cash Reserves']);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '1y' | 'all'>('1y');

  // Fetch accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await axios.get<Account[]>('http://localhost:8000/api/accounts/');
        setAccounts(response.data);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      }
    };

    fetchAccounts();
  }, []);

  // Filter accounts by selected portfolios and ensure they have asset_class
  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      const portfolioMatch = selectedPortfolios.includes(account.portfolio ?? null);
      const hasAssetClass = account.asset_class !== null && account.asset_class !== undefined;
      const isAsset = account.type === 'Asset';
      return portfolioMatch && hasAssetClass && isAsset;
    });
  }, [accounts, selectedPortfolios]);

  const handlePortfolioToggle = (portfolio: Portfolio) => {
    if (selectedPortfolios.includes(portfolio)) {
      setSelectedPortfolios(selectedPortfolios.filter(p => p !== portfolio));
    } else {
      setSelectedPortfolios([...selectedPortfolios, portfolio]);
    }
  };

  // Update chart when selections change
  useEffect(() => {
    const updateChart = async () => {
      if (filteredAccounts.length === 0) {
        setChartData(null);
        return;
      }

      try {
        setLoading(true);

        // Fetch values for filtered accounts
        const valuesPromises = filteredAccounts.map(account =>
          axios.get<Value[]>(`http://localhost:8000/api/values/account/${encodeURIComponent(account.name)}`)
        );

        const valuesResponses = await Promise.all(valuesPromises);
        const allValues = valuesResponses.flatMap((response, index) =>
          response.data.map(value => ({
            ...value,
            asset_class: filteredAccounts[index].asset_class!
          }))
        );

        if (allValues.length === 0) {
          setChartData(null);
          return;
        }

        // Calculate date cutoff based on time range
        const now = new Date();
        let cutoffDate = new Date(0); // Default to all time

        switch (timeRange) {
          case '3m':
            cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            break;
          case '6m':
            cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            break;
          case '1y':
            cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
            break;
        }

        // Filter values by date range
        const filteredValues = allValues.filter(value =>
          new Date(value.date) >= cutoffDate
        );

        // Group by month and asset class
        const monthlyData: { [month: string]: { [assetClass: string]: number } } = {};

        filteredValues.forEach(value => {
          const date = new Date(value.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {};
          }

          if (!monthlyData[monthKey][value.asset_class]) {
            monthlyData[monthKey][value.asset_class] = 0;
          }

          monthlyData[monthKey][value.asset_class] += value.amount;
        });

        // Get sorted months
        const sortedMonths = Object.keys(monthlyData).sort();

        // Get all unique asset classes
        const assetClasses = Array.from(
          new Set(filteredValues.map(v => v.asset_class))
        ).sort();

        // Color mapping for asset classes
        const colorMap: { [key: string]: string } = {
          'Cash': '#10B981',      // green
          'Equities': '#3B82F6',  // blue
          'Crypto': '#F59E0B',    // orange
          'Real Estate': '#8B5CF6' // purple
        };

        // Create datasets for each asset class
        const datasets = assetClasses.map(assetClass => ({
          label: assetClass,
          data: sortedMonths.map(month => monthlyData[month][assetClass] || 0),
          backgroundColor: colorMap[assetClass] || '#6B7280',
        }));

        // Format month labels
        const labels = sortedMonths.map(month => {
          const [year, monthNum] = month.split('-');
          const date = new Date(parseInt(year), parseInt(monthNum) - 1);
          return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        });

        setChartData({
          labels,
          datasets,
        });

      } catch (error) {
        console.error('Error fetching values:', error);
      } finally {
        setLoading(false);
      }
    };

    updateChart();
  }, [filteredAccounts, timeRange]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Asset Allocation by Portfolio',
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          footer: function(context: any) {
            let sum = 0;
            context.forEach((item: any) => {
              sum += item.parsed.y;
            });
            return 'Total: ' + new Intl.NumberFormat('en-GB', {
              style: 'currency',
              currency: 'GBP',
            }).format(sum);
          },
          label: function(context: any) {
            const value = context.parsed.y;
            const formattedValue = new Intl.NumberFormat('en-GB', {
              style: 'currency',
              currency: 'GBP',
            }).format(value);

            // Calculate total for this time period
            let total = 0;
            context.chart.data.datasets.forEach((dataset: any) => {
              total += dataset.data[context.dataIndex] || 0;
            });

            // Calculate percentage
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

            return `${context.dataset.label}: ${formattedValue} (${percentage}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: 'Month',
        },
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: 'Value (£)',
        },
        ticks: {
          callback: function(value: any) {
            return new Intl.NumberFormat('en-GB', {
              style: 'currency',
              currency: 'GBP',
              notation: 'compact',
            }).format(value);
          },
        },
      },
    },
  };

  return (
    <div className="container mx-auto px-4 py-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Portfolio Breakdown
        </h1>
        <p className="text-gray-600">
          Analyze your asset allocation across portfolios
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedPortfolios(['Liquid', 'Illiquid', 'Cash Reserves'])}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => setSelectedPortfolios([])}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Portfolio Filters */}
            <span className="text-sm font-medium text-gray-700">Portfolio:</span>
            <div className="flex items-center gap-3">
              {(['Liquid', 'Illiquid', 'Cash Reserves'] as Portfolio[]).map((portfolio) => (
                <label
                  key={portfolio}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer transition-colors text-sm ${
                    selectedPortfolios.includes(portfolio)
                      ? 'bg-blue-50 border-blue-300 text-blue-900'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPortfolios.includes(portfolio)}
                    onChange={() => handlePortfolioToggle(portfolio)}
                    className="w-3.5 h-3.5"
                  />
                  <span className="font-medium">{portfolio}</span>
                </label>
              ))}
            </div>

            <span className="text-gray-300 mx-2">|</span>

            {/* Time Range Filter */}
            <span className="text-sm font-medium text-gray-700">Period:</span>
            <div className="flex items-center gap-2">
              {[
                { value: '3m' as const, label: '3 Months' },
                { value: '6m' as const, label: '6 Months' },
                { value: '1y' as const, label: '1 Year' },
                { value: 'all' as const, label: 'All Time' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    timeRange === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 text-sm text-gray-600">
            {filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''} selected
          </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-lg shadow-md">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : !chartData || chartData.datasets.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-500 text-center">
                <div className="text-lg font-medium">No data to display</div>
                <div className="text-sm mt-2">
                  {selectedPortfolios.length === 0
                    ? 'Please select at least one portfolio'
                    : 'No assets with asset classes found for the selected portfolios'
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          )}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 mt-4">
        <p>Connected to API • {accounts.length} accounts loaded</p>
      </div>
    </div>
  );
}

export default PortfolioBreakdown;
