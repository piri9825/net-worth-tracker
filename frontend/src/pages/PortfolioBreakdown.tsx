import { useState, useEffect, useMemo } from 'react';
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
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { accountsApi, valuesApi } from '../services/api';
import type { Account, Portfolio } from '../types/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ASSET_CLASS_COLORS: Record<string, string> = {
  'Cash': '#10B981',
  'Equities': '#3B82F6',
  'Crypto': '#F59E0B',
  'Real Estate': '#8B5CF6',
};

const PORTFOLIO_STYLES: Record<NonNullable<Portfolio>, string> = {
  'Liquid': 'bg-blue-100 text-blue-800 border-blue-200',
  'Illiquid': 'bg-amber-100 text-amber-800 border-amber-200',
  'Cash Reserves': 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const ALL_PORTFOLIOS: Portfolio[] = ['Liquid', 'Illiquid', 'Cash Reserves'];

type TimeRange = '3m' | '6m' | '1y' | 'all';

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
];

function PortfolioBreakdown() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedPortfolios, setSelectedPortfolios] = useState<Portfolio[]>([...ALL_PORTFOLIOS]);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('1y');

  useEffect(() => {
    accountsApi.getAll()
      .then(setAccounts)
      .catch(err => console.error('Error fetching accounts:', err));
  }, []);

  const filteredAccounts = useMemo(() => accounts.filter(account =>
    selectedPortfolios.includes(account.portfolio ?? null) &&
    account.asset_class != null &&
    account.type === 'Asset'
  ), [accounts, selectedPortfolios]);

  const togglePortfolio = (portfolio: Portfolio) =>
    setSelectedPortfolios(prev =>
      prev.includes(portfolio) ? prev.filter(p => p !== portfolio) : [...prev, portfolio]
    );

  useEffect(() => {
    if (filteredAccounts.length === 0) { setChartData(null); return; }

    const updateChart = async () => {
      try {
        setLoading(true);

        const responses = await Promise.all(
          filteredAccounts.map(account => valuesApi.getByAccount(account.name))
        );

        const allValues = responses.flatMap((data, i) =>
          data.map(v => ({ ...v, asset_class: filteredAccounts[i].asset_class! }))
        );

        if (allValues.length === 0) { setChartData(null); return; }

        const now = new Date();
        const cutoffs: Record<TimeRange, Date> = {
          '3m': new Date(now.getFullYear(), now.getMonth() - 3, 1),
          '6m': new Date(now.getFullYear(), now.getMonth() - 6, 1),
          '1y': new Date(now.getFullYear() - 1, now.getMonth(), 1),
          'all': new Date(0),
        };
        const filtered = allValues.filter(v => new Date(v.date) >= cutoffs[timeRange]);

        const monthlyData: Record<string, Record<string, number>> = {};
        filtered.forEach(v => {
          const d = new Date(v.date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyData[key]) monthlyData[key] = {};
          monthlyData[key][v.asset_class] = (monthlyData[key][v.asset_class] ?? 0) + v.amount;
        });

        const sortedMonths = Object.keys(monthlyData).sort();
        const assetClasses = [...new Set(filtered.map(v => v.asset_class))].sort();

        const datasets = assetClasses.map(ac => ({
          label: ac,
          data: sortedMonths.map(m => monthlyData[m][ac] ?? 0),
          backgroundColor: ASSET_CLASS_COLORS[ac] ?? '#6B7280',
        }));

        const labels = sortedMonths.map(m => {
          const [y, mo] = m.split('-');
          return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
        });

        setChartData({ labels, datasets });
      } catch (err) {
        console.error('Error fetching values:', err);
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
      legend: { position: 'top' as const },
      title: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          footer: (ctx: any[]) => {
            const sum = ctx.reduce((acc, item) => acc + item.parsed.y, 0);
            return 'Total: ' + new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(sum);
          },
          label: (ctx: any) => {
            const value = ctx.parsed.y;
            const total = ctx.chart.data.datasets.reduce((acc: number, ds: any) => acc + (ds.data[ctx.dataIndex] ?? 0), 0);
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            const formatted = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
            return `${ctx.dataset.label}: ${formatted} (${pct}%)`;
          },
        },
      },
    },
    scales: {
      x: { stacked: true, title: { display: true, text: 'Month' } },
      y: {
        stacked: true,
        title: { display: true, text: 'Value (£)' },
        ticks: {
          callback: (v: any) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', notation: 'compact' }).format(v),
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio Breakdown</h1>
        <p className="text-muted-foreground mt-1">Analyze your asset allocation across portfolios.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              Filters
              <span className="ml-2 text-muted-foreground font-normal text-sm">
                {filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''} matched
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedPortfolios([...ALL_PORTFOLIOS])}>
                Select all
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedPortfolios([])}>
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Portfolio</span>
              <div className="flex flex-wrap gap-2">
                {ALL_PORTFOLIOS.map(portfolio => (
                  <button
                    key={portfolio}
                    onClick={() => togglePortfolio(portfolio)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                      selectedPortfolios.includes(portfolio)
                        ? PORTFOLIO_STYLES[portfolio!]
                        : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    <Checkbox
                      checked={selectedPortfolios.includes(portfolio)}
                      onCheckedChange={() => togglePortfolio(portfolio)}
                      className="h-3 w-3 pointer-events-none"
                    />
                    {portfolio}
                  </button>
                ))}
              </div>
            </div>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Period</span>
              <ToggleGroup
                value={[timeRange]}
                onValueChange={v => v.length > 0 && setTimeRange(v[v.length - 1] as TimeRange)}
                className="bg-muted rounded-lg p-0.5"
              >
                {TIME_RANGE_OPTIONS.map(opt => (
                  <ToggleGroupItem
                    key={opt.value}
                    value={opt.value}
                    className="text-xs h-7 px-3 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm"
                  >
                    {opt.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>

          {/* Asset class legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
            {Object.entries(ASSET_CLASS_COLORS).map(([ac, color]) => (
              <div key={ac} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                <Label className="text-xs text-muted-foreground">{ac}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">Asset Allocation Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !chartData ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <p className="text-muted-foreground font-medium">No data to display</p>
              <p className="text-muted-foreground text-sm mt-1">
                {selectedPortfolios.length === 0 ? 'Select at least one portfolio' : 'No assets with asset classes found'}
              </p>
            </div>
          ) : (
            <div className="h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        {accounts.length} accounts loaded
      </p>
    </div>
  );
}

export default PortfolioBreakdown;
