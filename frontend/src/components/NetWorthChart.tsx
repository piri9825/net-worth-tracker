import React, { useState, useEffect } from 'react';
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
import { ViewMode, Value, Account } from '../types/api';
import { dataService } from '../services/api';

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

interface NetWorthChartProps {
  selectedAccounts: string[];
  viewMode: ViewMode;
  dateRange?: {
    start_date?: string;
    end_date?: string;
  };
}

interface ChartDataset {
  label: string;
  data: { x: string; y: number }[];
  borderColor: string;
  backgroundColor: string;
  tension: number;
}

export const NetWorthChart: React.FC<NetWorthChartProps> = ({
  selectedAccounts,
  viewMode,
  dateRange,
}) => {
  const [chartData, setChartData] = useState<{ datasets: ChartDataset[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const colors = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // yellow
    '#8B5CF6', // purple
    '#F97316', // orange
    '#06B6D4', // cyan
    '#84CC16', // lime
    '#EC4899', // pink
    '#6B7280', // gray
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (selectedAccounts.length === 0) {
        setChartData({ datasets: [] });
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get account details
        const allAccounts = await dataService.getAccountsByTags([]);
        const selectedAccountObjects = allAccounts.filter(acc => 
          selectedAccounts.includes(acc.name)
        );
        setAccounts(selectedAccountObjects);

        // Get values for selected accounts
        const values = await dataService.getValuesByAccounts(
          selectedAccountObjects,
          dateRange
        );

        if (values.length === 0) {
          setChartData({ datasets: [] });
          return;
        }

        let datasets: ChartDataset[];

        if (viewMode === 'aggregated') {
          // Aggregate all values by date
          const aggregatedData: { [date: string]: number } = {};
          
          values.forEach(value => {
            const dateKey = value.date.split('T')[0]; // Get just the date part
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
          datasets = selectedAccountObjects.map((account, index) => {
            const accountValues = values.filter(v => v.account_name === account.name);
            const data = accountValues.map(value => ({
              x: value.date.split('T')[0],
              y: value.amount,
            }));

            // Sort by date
            data.sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());

            return {
              label: account.name,
              data,
              borderColor: colors[index % colors.length],
              backgroundColor: colors[index % colors.length] + '20',
              tension: 0.1,
            };
          });
        }

        setChartData({ datasets });
      } catch (err) {
        setError('Failed to load chart data');
        console.error('Error loading chart data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedAccounts, viewMode, dateRange]);

  const options = {
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

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center h-96">
          <div className="text-red-600 text-center">
            <div className="text-lg font-medium">Error loading chart</div>
            <div className="text-sm mt-2">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.datasets.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500 text-center">
            <div className="text-lg font-medium">No data to display</div>
            <div className="text-sm mt-2">
              {selectedAccounts.length === 0 
                ? 'Please select some accounts to view the chart'
                : 'No data available for the selected accounts and date range'
              }
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="h-96">
        <Line data={chartData} options={options} />
      </div>
      
      {/* Summary statistics */}
      {viewMode === 'aggregated' && chartData.datasets[0]?.data.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {(() => {
            const data = chartData.datasets[0].data;
            const latest = data[data.length - 1]?.y || 0;
            const earliest = data[0]?.y || 0;
            const change = latest - earliest;
            const percentChange = earliest !== 0 ? (change / earliest) * 100 : 0;

            return (
              <>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Current Value</div>
                  <div className="text-lg font-bold text-gray-900">
                    {new Intl.NumberFormat('en-GB', {
                      style: 'currency',
                      currency: 'GBP',
                    }).format(latest)}
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Total Change</div>
                  <div className={`text-lg font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {change >= 0 ? '+' : ''}
                    {new Intl.NumberFormat('en-GB', {
                      style: 'currency',
                      currency: 'GBP',
                    }).format(change)}
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Percentage Change</div>
                  <div className={`text-lg font-bold ${percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {percentChange >= 0 ? '+' : ''}
                    {percentChange.toFixed(2)}%
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};