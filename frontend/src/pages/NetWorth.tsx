import { useState, useEffect } from 'react';
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
import { Loader2, ChevronDown, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { accountsApi, valuesApi } from '../services/api';
import type { Account, Value, ViewMode, Term, AccountType } from '../types/api';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale
);

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6B7280',
];

const TERM_STYLES: Record<NonNullable<Term>, string> = {
  'Short Term': 'bg-sky-100 text-sky-800 border-sky-200',
  'Long Term':  'bg-purple-100 text-purple-800 border-purple-200',
};

const TYPE_STYLES: Record<NonNullable<AccountType>, string> = {
  'Asset':     'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Liability': 'bg-red-100 text-red-800 border-red-200',
};

function FilterChip({
  label,
  active,
  activeClass,
  onToggle,
}: {
  label: string;
  active: boolean;
  activeClass: string;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
        active ? activeClass : 'border-border bg-background text-muted-foreground hover:bg-secondary'
      }`}
    >
      <Checkbox
        checked={active}
        onCheckedChange={onToggle}
        className="h-3 w-3 pointer-events-none"
      />
      {label}
    </button>
  );
}

function NetWorth() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<Term[]>([]);
  const [selectedType, setSelectedType] = useState<AccountType[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('aggregated');
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    accountsApi.getAll()
      .then(setAccounts)
      .catch(err => console.error('Error fetching accounts:', err));
  }, []);

  // Close popover when the page scrolls (not when scrolling inside the popover)
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

  // Drop accounts that no longer match the filter
  useEffect(() => {
    const validNames = new Set(filteredAccounts.map(a => a.name));
    setSelectedAccounts(prev => prev.filter(n => validNames.has(n)));
  }, [selectedTerm, selectedType]);

  // Fetch values and build chart
  useEffect(() => {
    if (selectedAccounts.length === 0) { setChartData(null); return; }

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
            backgroundColor: COLORS[0] + '20',
            tension: 0.3,
          }];
        } else {
          datasets = selectedAccounts.map((name, i) => ({
            label: name,
            data: allValues
              .filter(v => v.account_name === name)
              .map(v => ({ x: v.date.split('T')[0], y: v.amount })),
            borderColor: COLORS[i % COLORS.length],
            backgroundColor: COLORS[i % COLORS.length] + '20',
            tension: 0.3,
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
          title: (ctx: any[]) => {
            if (!ctx.length) return '';
            return new Date(ctx[0].parsed.x).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
          },
          label: (ctx: any) => {
            const formatted = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(ctx.parsed.y);
            return `${ctx.dataset.label}: ${formatted}`;
          },
        },
      },
    },
    scales: {
      x: { type: 'time' as const, time: { unit: 'month' as const }, title: { display: true, text: 'Date' } },
      y: {
        title: { display: true, text: 'Value (£)' },
        ticks: {
          callback: (v: any) =>
            new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', notation: 'compact' }).format(v),
        },
      },
    },
    interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false },
  };

  const toggleAccount = (name: string) =>
    setSelectedAccounts(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Net Worth</h1>
        <p className="text-muted-foreground mt-1">Track and visualize your account values over time.</p>
      </div>

      {/* Compact filter bar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-2">

            {/* Type filters */}
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

            {/* Term filters */}
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

            {/* Account popover */}
            <Popover
              open={popoverOpen}
              onOpenChange={(open: boolean) => setPopoverOpen(open)}
            >
              <PopoverTrigger
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-secondary transition-colors"
              >
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {selectedAccounts.length > 0
                  ? `${selectedAccounts.length} of ${filteredAccounts.length} accounts`
                  : `${filteredAccounts.length} accounts`}
                <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${popoverOpen ? 'rotate-180' : ''}`} />
              </PopoverTrigger>
              <PopoverContent
                className="w-[520px]"
                align="start"
                sideOffset={6}
              >
                {/* Popover header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Select accounts
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedAccounts(filteredAccounts.map(a => a.name))}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Select all
                    </button>
                    <span className="text-border">|</span>
                    <button
                      onClick={() => setSelectedAccounts([])}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Account grid */}
                <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-1">
                  {filteredAccounts.map(account => {
                    const isSelected = selectedAccounts.includes(account.name);
                    return (
                      <Label
                        key={account.name}
                        htmlFor={`pop-account-${account.name}`}
                        className={`flex items-start gap-2 p-2.5 rounded-md border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-primary/5 border-primary/30'
                            : 'border-border hover:bg-secondary/50'
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

            {/* Quick actions */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedAccounts(filteredAccounts.map(a => a.name))}
            >
              Select all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedAccounts([])}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-4">
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
                Split by Account
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
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
                {selectedAccounts.length === 0
                  ? 'Use the filter bar above to select accounts'
                  : 'No data available for the selected accounts'}
              </p>
            </div>
          ) : (
            <div className="h-96">
              <Line data={chartData} options={chartOptions} />
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

export default NetWorth;
