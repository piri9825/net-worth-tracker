import { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Loader2, PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { accountsApi, valuesApi } from '../services/api';
import { useTheme } from '../contexts/theme';
import type { Account, Portfolio } from '../types/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const ASSET_CLASS_COLORS: Record<string, string> = {
  'Cash':        '#10B981',
  'Equities':    '#3B82F6',
  'Crypto':      '#F59E0B',
  'Real Estate': '#8B5CF6',
};

const PORTFOLIO_STYLES: Record<NonNullable<Portfolio>, string> = {
  'Liquid':        'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  'Illiquid':      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  'Cash Reserves': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
};

const ALL_PORTFOLIOS: Portfolio[] = ['Liquid', 'Illiquid', 'Cash Reserves'];

type TimeRange = '3m' | '6m' | '1y' | 'all';
const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
];

const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);


function PortfolioBreakdown() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedPortfolios, setSelectedPortfolios] = useState<Portfolio[]>([...ALL_PORTFOLIOS]);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('1y');

  useEffect(() => {
    accountsApi.getAll().then(setAccounts).catch(console.error);
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
          borderRadius: 2,
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

  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const tickColor = isDark ? '#94a3b8' : '#64748b';

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: tickColor, boxWidth: 12, padding: 16, font: { size: 12 } },
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.97)',
        titleColor: isDark ? '#e2e8f0' : '#0f172a',
        bodyColor: isDark ? '#94a3b8' : '#475569',
        footerColor: isDark ? '#e2e8f0' : '#0f172a',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        padding: 10,
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          footer: (ctx: any[]) => {
            const sum = ctx.reduce((acc, item) => acc + item.parsed.y, 0);
            return 'Total: ' + fmtFull(sum);
          },
          label: (ctx: any) => {
            const value = ctx.parsed.y;
            const total = (ctx.chart.tooltip.dataPoints as any[]).reduce(
              (acc: number, dp: any) => acc + dp.parsed.y, 0
            );
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${ctx.dataset.label}: ${fmtFull(value)} (${pct}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { color: tickColor, font: { size: 11 } },
        border: { color: gridColor },
      },
      y: {
        stacked: true,
        grid: { color: gridColor },
        ticks: {
          color: tickColor,
          font: { size: 11 },
          callback: (v: any) =>
            new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', notation: 'compact' }).format(v),
        },
        border: { color: gridColor },
      },
    },
  }), [isDark, gridColor, tickColor]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio Breakdown</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Analyze your asset allocation across portfolios.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Portfolio</span>
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

            <div className="flex items-center gap-1 ml-auto">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedPortfolios([...ALL_PORTFOLIOS])}>All</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedPortfolios([])}>Clear</Button>
            </div>

            <Separator orientation="vertical" className="h-4" />

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

          {/* Asset class legend */}
          <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-border">
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Asset Allocation Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 26rem)' }}>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !chartData ? (
            <div className="flex flex-col items-center justify-center text-center" style={{ height: 'calc(100vh - 26rem)' }}>
              <div className="rounded-full bg-muted p-4 mb-3">
                <PieChart className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm">No data to display</p>
              <p className="text-muted-foreground text-xs mt-1">
                {selectedPortfolios.length === 0 ? 'Select at least one portfolio above' : 'No assets with asset classes found'}
              </p>
            </div>
          ) : (
            <div style={{ height: 'calc(100vh - 26rem)', minHeight: '360px' }}>
              <Bar data={chartData} options={chartOptions} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PortfolioBreakdown;
