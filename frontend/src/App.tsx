import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// Types
interface Account {
  name: string;
  description?: string;
  tags: string[];
}

interface Value {
  id: string;
  account_name: string;
  amount: number;
  date: string;
}

type ViewMode = 'aggregated' | 'split';

function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('aggregated');
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch accounts and tags on mount
  useEffect(() => {
    const fetchAccountsAndTags = async () => {
      try {
        const response = await axios.get<Account[]>('http://localhost:8000/api/accounts/');
        const accountsData = response.data;
        setAccounts(accountsData);
        
        // Extract unique tags
        const tags = [...new Set(accountsData.flatMap(acc => acc.tags))].sort();
        setAllTags(tags);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      }
    };
    
    fetchAccountsAndTags();
  }, []);

  // Filter accounts by selected tags - OR within groups, AND across groups
  const filteredAccounts = selectedTags.length === 0 
    ? accounts 
    : accounts.filter(account => {
        // Group the selected tags
        const typeFilters = selectedTags.filter(tag => ['Asset', 'Liability'].includes(tag));
        const timeFilters = selectedTags.filter(tag => ['Short Term', 'Long Term'].includes(tag));

        // Check each group (AND across groups, OR within groups)
        const typeMatch = typeFilters.length === 0 || typeFilters.some(tag => account.tags.includes(tag));
        const timeMatch = timeFilters.length === 0 || timeFilters.some(tag => account.tags.includes(tag));

        return typeMatch && timeMatch;
      });

  // Update selected accounts when tags change - keep only accounts that match the current filter
  useEffect(() => {
    if (selectedTags.length > 0) {
      const validAccountNames = filteredAccounts.map(acc => acc.name);
      const updatedSelectedAccounts = selectedAccounts.filter(accountName =>
        validAccountNames.includes(accountName)
      );
      
      if (updatedSelectedAccounts.length !== selectedAccounts.length) {
        setSelectedAccounts(updatedSelectedAccounts);
      }
    }
  }, [selectedTags, filteredAccounts]);

  // Update chart when selections change
  useEffect(() => {
    const updateChart = async () => {
      if (selectedAccounts.length === 0) {
        setChartData(null);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch values for selected accounts
        const valuesPromises = selectedAccounts.map(accountName =>
          axios.get<Value[]>(`http://localhost:8000/api/values/account/${encodeURIComponent(accountName)}`)
        );
        
        const valuesResponses = await Promise.all(valuesPromises);
        const allValues = valuesResponses.flatMap(response => response.data);
        
        if (allValues.length === 0) {
          setChartData(null);
          return;
        }

        // Sort values by date
        allValues.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const colors = [
          '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
          '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6B7280'
        ];

        let datasets;

        if (viewMode === 'aggregated') {
          // Aggregate values by date
          const aggregatedData: { [date: string]: number } = {};
          
          allValues.forEach(value => {
            const dateKey = value.date.split('T')[0];
            if (!aggregatedData[dateKey]) {
              aggregatedData[dateKey] = 0;
            }
            aggregatedData[dateKey] += value.amount;
          });

          const sortedDates = Object.keys(aggregatedData).sort();
          const data = sortedDates.map(date => ({
            x: date,
            y: aggregatedData[date],
          }));

          datasets = [
            {
              label: 'Total Net Worth',
              data,
              borderColor: colors[0],
              backgroundColor: colors[0] + '20',
              tension: 0.1,
            },
          ];
        } else {
          // Split view - one line per account
          datasets = selectedAccounts.map((accountName, index) => {
            const accountValues = allValues.filter(v => v.account_name === accountName);
            const data = accountValues.map(value => ({
              x: value.date.split('T')[0],
              y: value.amount,
            }));

            return {
              label: accountName,
              data,
              borderColor: colors[index % colors.length],
              backgroundColor: colors[index % colors.length] + '20',
              tension: 0.1,
            };
          });
        }

        setChartData({ datasets });
      } catch (error) {
        console.error('Error fetching values:', error);
      } finally {
        setLoading(false);
      }
    };

    updateChart();
  }, [selectedAccounts, viewMode]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: viewMode === 'aggregated' ? 'Net Worth Over Time' : 'Account Values Over Time',
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: function(context: any) {
            if (context.length > 0) {
              const date = new Date(context[0].parsed.x);
              return date.toLocaleDateString('en-GB', {
                month: 'long',
                year: 'numeric'
              });
            }
            return '';
          },
          label: function(context: any) {
            const value = context.parsed.y;
            const formattedValue = new Intl.NumberFormat('en-GB', {
              style: 'currency',
              currency: 'GBP',
            }).format(value);
            return `${context.dataset.label}: ${formattedValue}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'month' as const,
        },
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
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
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAccountToggle = (accountName: string) => {
    if (selectedAccounts.includes(accountName)) {
      setSelectedAccounts(selectedAccounts.filter(name => name !== accountName));
    } else {
      setSelectedAccounts([...selectedAccounts, accountName]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Net Worth Tracker
          </h1>
          <p className="text-gray-600">
            Track and visualize your account values over time
          </p>
        </div>

        {/* Controls Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Tag Filter - Compact */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Filter by Tags</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedTags(allTags)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => setSelectedTags([])}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Type */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Type</h4>
                <div className="flex justify-center gap-x-6">
                  {['Asset', 'Liability'].filter(tag => allTags.includes(tag)).map((tag) => (
                    <label
                      key={tag}
                      className={`flex items-center space-x-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedTags.includes(tag)
                          ? (tag === 'Asset' ? 'bg-green-50 border-green-300 text-green-900' : 'bg-red-50 border-red-300 text-red-900')
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag)}
                        onChange={() => handleTagToggle(tag)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">{tag}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Time Horizon */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Time Horizon</h4>
                <div className="flex justify-center gap-x-6">
                  {['Short Term', 'Long Term'].filter(tag => allTags.includes(tag)).map((tag) => (
                    <label
                      key={tag}
                      className={`flex items-center space-x-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedTags.includes(tag)
                          ? (tag === 'Short Term' ? 'bg-sky-50 border-sky-300 text-sky-900' : 'bg-purple-50 border-purple-300 text-purple-900')
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag)}
                        onChange={() => handleTagToggle(tag)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Account Selector */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Select Accounts ({filteredAccounts.length} available)
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedAccounts(filteredAccounts.map(acc => acc.name))}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => setSelectedAccounts([])}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {filteredAccounts.map((account) => (
                <div key={account.name} className="relative group">
                  <label
                    className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAccounts.includes(account.name)
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAccounts.includes(account.name)}
                      onChange={() => handleAccountToggle(account.name)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">
                        <span className="font-medium text-gray-900">{account.name}</span>
                        {account.description && (
                          <span className="text-xs text-gray-500 ml-2">({account.description})</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {account.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                              tag === 'Asset' ? 'bg-green-100 text-green-800' :
                              tag === 'Liability' ? 'bg-red-100 text-red-800' :
                              tag === 'Short Term' ? 'bg-sky-100 text-sky-800' :
                              tag === 'Long Term' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </label>
                </div>
              ))}
            </div>

            {selectedAccounts.length > 0 && (
              <div className="mt-4 text-sm text-gray-600">
                {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {viewMode === 'aggregated' ? 'Net Worth Over Time' : 'Account Values Over Time'}
            </h3>
            
            {/* View Mode Toggle - Integrated in Chart Header */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('aggregated')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'aggregated'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Aggregated
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'split'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Split by Account
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : !chartData || chartData.datasets.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-500 text-center">
                <div className="text-lg font-medium">No data to display</div>
                <div className="text-sm mt-2">
                  {selectedAccounts.length === 0 
                    ? 'Please select some accounts to view the chart'
                    : 'No data available for the selected accounts'
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-4">
          <p>Connected to API • {accounts.length} accounts loaded</p>
        </div>
      </div>
    </div>
  );
}

export default App;
