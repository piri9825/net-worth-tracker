import { useState, useEffect, useMemo } from 'react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { Loader2, ChevronDown, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { accountsApi, valuesApi } from '../services/api';
import { useTheme } from '../contexts/theme';
import { computeSummaryStats } from '../lib/stats';
import SummaryStats from '../components/SummaryStats';
import type { Account, Value, ViewMode, Term, AccountType } from '../types/api';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, TimeScale, Filler
);

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6B7280',
];

const TERM_STYLES: Record<NonNullable<Term>, string> = {
  'Short Term': 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
  'Long Term':  'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
};

const TYPE_STYLES: Record<NonNullable<AccountType>, string> = {
  'Asset':     'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  'Liability': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
};

const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);


function FilterChip({
  label, active, activeClass, onToggle,
}: {
  label: string; active: boolean; activeClass: string; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
        active ? activeClass : 'border-border bg-background text-muted-foreground hover:bg-secondary'
      }`}
    >
      <Checkbox checked={active} onCheckedChange={onToggle} className="h-3 w-3 pointer-events-none" />
      {label}
    </button>
  );
}

function NetWorth() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allValues, setAllValues] = useState<Value[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<Term[]>([]);
  const [selectedType, setSelectedType] = useState<AccountType[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('aggregated');
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    accountsApi
      .getAll()
      .then(list => {
        setAccounts(list);
        setSelectedAccounts(list.map(a => a.name));
      })
      .catch(console.error);
    valuesApi.getAll().then(setAllValues).catch(console.error);
  }, []);

  const summaryStats = useMemo(
    () => computeSummaryStats(accounts, allValues),
    [accounts, allValues]
  );

  useEffect(() => {
    const handleScroll = () => setPopoverOpen(false);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredAccounts = accounts.filter(account => {
    const termMatch = selectedTerm.length === 0 || selectedTerm.includes(account.term ?? null);
    const typeMatch = selectedType.length === 0 || selectedType.includes(account.type ?? null);
    return termMatch && typeMatch;
  });

  useEffect(() => {
    const validNames = new Set(filteredAccounts.map(a => a.name));
    setSelectedAccounts(prev => prev.filter(n => validNames.has(n)));
  }, [selectedTerm, selectedType]);

  useEffect(() => {
    if (selectedAccounts.length === 0) {
      setChartData(null);
      return;
    }

    const updateChart = async () => {
      try {
        setLoading(true);
        const responses = await Promise.all(
          selectedAccounts.map(name => valuesApi.getByAccount(name))
        );
        const allValues: Value[] = responses.flat().sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        if (allValues.length === 0) { setChartData(null); return; }

        let datasets;
        if (viewMode === 'aggregated') {
          const byDate: Record<string, number> = {};
          allValues.forEach(v => {
            const d = v.date.split('T')[0];
            byDate[d] = (byDate[d] ?? 0) + v.amount;
          });
          const data = Object.keys(byDate).sort().map(x => ({ x, y: byDate[x] }));
          datasets = [{
            label: 'Total Net Worth',
            data,
            borderColor: COLORS[0],
            backgroundColor: COLORS[0] + '18',
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 5,
          }];
        } else {
          datasets = selectedAccounts.map((name, i) => ({
            label: name,
            data: allValues
              .filter(v => v.account_name === name)
              .map(v => ({ x: v.date.split('T')[0], y: v.amount })),
            borderColor: COLORS[i % COLORS.length],
            backgroundColor: COLORS[i % COLORS.length] + '18',
            fill: false,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 5,
          }));
        }
        setChartData({ datasets });
      } catch (err) {
        console.error('Error fetching values:', err);
      } finally {
        setLoading(false);
      }
    };

    updateChart();
  }, [selectedAccounts, viewMode]);

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
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        padding: 10,
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: (ctx: any[]) => {
            if (!ctx.length) return '';
            return new Date(ctx[0].parsed.x).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
          },
          label: (ctx: any) => `${ctx.dataset.label}: ${fmtFull(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: { unit: 'month' as const },
        grid: { color: gridColor },
        ticks: { color: tickColor, font: { size: 11 } },
        title: { display: false },
        border: { color: gridColor },
      },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: tickColor,
          font: { size: 11 },
          callback: (v: any) =>
            new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', notation: 'compact' }).format(v),
        },
        title: { display: false },
        border: { color: gridColor },
      },
    },
    interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false },
  }), [isDark, gridColor, tickColor]);

  const toggleAccount = (name: string) =>
    setSelectedAccounts(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Net Worth</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Track and visualize your account values over time.</p>
      </div>

      {/* Summary tiles (all accounts, independent of the filters below) */}
      {summaryStats && <SummaryStats stats={summaryStats} />}

      {/* Compact filter bar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</span>
            {(['Asset', 'Liability'] as NonNullable<AccountType>[]).map(type => (
              <FilterChip
                key={type}
                label={type}
                active={selectedType.includes(type)}
                activeClass={TYPE_STYLES[type]}
                onToggle={() =>
                  setSelectedType(prev =>
                    prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                  )
                }
              />
            ))}

            <Separator orientation="vertical" className="h-4" />

            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Term</span>
            {(['Short Term', 'Long Term'] as NonNullable<Term>[]).map(term => (
              <FilterChip
                key={term}
                label={term}
                active={selectedTerm.includes(term)}
                activeClass={TERM_STYLES[term]}
                onToggle={() =>
                  setSelectedTerm(prev =>
                    prev.includes(term) ? prev.filter(t => t !== term) : [...prev, term]
                  )
                }
              />
            ))}

            <Separator orientation="vertical" className="h-4" />

            <Popover open={popoverOpen} onOpenChange={(open: boolean) => setPopoverOpen(open)}>
              <PopoverTrigger className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-secondary transition-colors">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {selectedAccounts.length > 0
                  ? `${selectedAccounts.length} of ${filteredAccounts.length} accounts`
                  : `${filteredAccounts.length} accounts`}
                <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${popoverOpen ? 'rotate-180' : ''}`} />
              </PopoverTrigger>
              <PopoverContent className="w-[520px]" align="start" sideOffset={6}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Select accounts</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedAccounts(filteredAccounts.map(a => a.name))} className="text-xs text-primary hover:underline">
                      Select all
                    </button>
                    <span className="text-border">|</span>
                    <button onClick={() => setSelectedAccounts([])} className="text-xs text-primary hover:underline">
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-1">
                  {filteredAccounts.map(account => {
                    const isSelected = selectedAccounts.includes(account.name);
                    return (
                      <Label
                        key={account.name}
                        htmlFor={`pop-account-${account.name}`}
                        className={`flex items-start gap-2 p-2.5 rounded-md border cursor-pointer transition-all ${
                          isSelected ? 'bg-primary/5 border-primary/30' : 'border-border hover:bg-secondary/50'
                        }`}
                      >
                        <Checkbox
                          id={`pop-account-${account.name}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleAccount(account.name)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-medium leading-none truncate">{account.name}</p>
                          <div className="flex flex-wrap gap-1">
                            {account.type && (
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TYPE_STYLES[account.type]}`}>
                                {account.type}
                              </Badge>
                            )}
                            {account.term && (
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TERM_STYLES[account.term]}`}>
                                {account.term}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedAccounts(filteredAccounts.map(a => a.name))}>
              Select all
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedAccounts([])}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              {viewMode === 'aggregated' ? 'Net Worth Over Time' : 'Account Values Over Time'}
              {selectedAccounts.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''}
                </span>
              )}
            </CardTitle>
            <ToggleGroup
              value={[viewMode]}
              onValueChange={v => v.length > 0 && setViewMode(v[v.length - 1] as ViewMode)}
              className="bg-muted rounded-lg p-0.5"
            >
              <ToggleGroupItem value="aggregated" className="text-xs h-7 px-3 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">
                Aggregated
              </ToggleGroupItem>
              <ToggleGroupItem value="split" className="text-xs h-7 px-3 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">
                Split
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 26rem)' }}>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !chartData ? (
            <div className="flex flex-col items-center justify-center text-center" style={{ height: 'calc(100vh - 26rem)' }}>
              <div className="rounded-full bg-muted p-4 mb-3">
                <TrendingUp className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm">No data to display</p>
              <p className="text-muted-foreground text-xs mt-1">
                {selectedAccounts.length === 0 ? 'Open the accounts picker above to get started' : 'No data available for the selected accounts'}
              </p>
            </div>
          ) : (
            <div style={{ height: 'calc(100vh - 26rem)', minHeight: '360px' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default NetWorth;
