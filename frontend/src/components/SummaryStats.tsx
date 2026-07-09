import { Card, CardContent } from '@/components/ui/card';
import type { SummaryStats as Stats, Delta } from '../lib/stats';

export const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);

export const fmtSigned = (n: number) => (n >= 0 ? `+${fmtCurrency(n)}` : fmtCurrency(n));

export const directionClass = (n: number) =>
  n >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';

const deltaSub = (delta: Delta) =>
  `${
    delta.pct != null ? `${delta.pct >= 0 ? '+' : ''}${delta.pct.toFixed(1)}% ` : ''
  }${delta.vsLabel}`;

function Tile({
  label,
  value,
  valueClass = '',
  sub,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-semibold mt-1 ${valueClass}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SummaryStats({ stats }: { stats: Stats }) {
  const asOf = new Date(stats.latestDate).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Tile label="Net worth" value={fmtCurrency(stats.netWorth)} sub={`as of ${asOf}`} />
      <Tile
        label="Monthly change"
        value={stats.monthDelta ? fmtSigned(stats.monthDelta.amount) : '—'}
        valueClass={stats.monthDelta ? directionClass(stats.monthDelta.amount) : ''}
        sub={stats.monthDelta ? deltaSub(stats.monthDelta) : 'No previous month'}
      />
      <Tile
        label="Year to date"
        value={stats.ytdDelta ? fmtSigned(stats.ytdDelta.amount) : '—'}
        valueClass={stats.ytdDelta ? directionClass(stats.ytdDelta.amount) : ''}
        sub={stats.ytdDelta ? deltaSub(stats.ytdDelta) : 'No prior year data'}
      />
      <Tile
        label="Assets / Liabilities"
        value={fmtCurrency(stats.assets)}
        sub={`${fmtCurrency(Math.abs(stats.liabilities))} in liabilities`}
      />
    </div>
  );
}

export default SummaryStats;
