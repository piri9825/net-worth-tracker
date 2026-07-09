import type { Account, Value } from '../types/api';

export interface Delta {
  amount: number;
  pct: number | null;
  vsLabel: string;
}

export interface SummaryStats {
  latestDate: string;
  netWorth: number;
  assets: number;
  liabilities: number;
  monthDelta: Delta | null;
  ytdDelta: Delta | null;
}

const monthLabel = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

function makeDelta(current: number, baseline: number, vsLabel: string): Delta {
  return {
    amount: current - baseline,
    pct: baseline !== 0 ? ((current - baseline) / Math.abs(baseline)) * 100 : null,
    vsLabel,
  };
}

/** Totals per date, dates ascending. */
export function totalsByDate(values: Value[]): { date: string; total: number }[] {
  const byDate: Record<string, number> = {};
  values.forEach(v => {
    const d = v.date.split('T')[0];
    byDate[d] = (byDate[d] ?? 0) + v.amount;
  });
  return Object.keys(byDate)
    .sort()
    .map(date => ({ date, total: byDate[date] }));
}

export function computeSummaryStats(accounts: Account[], values: Value[]): SummaryStats | null {
  const totals = totalsByDate(values);
  if (totals.length === 0) return null;

  const latest = totals[totals.length - 1];
  const previous = totals.length > 1 ? totals[totals.length - 2] : null;

  // YTD baseline: the last data point of the previous year
  const latestYear = latest.date.slice(0, 4);
  const priorYearTotals = totals.filter(t => t.date.slice(0, 4) < latestYear);
  const ytdBaseline = priorYearTotals.length ? priorYearTotals[priorYearTotals.length - 1] : null;

  // Assets vs liabilities at the latest date, using account type when set
  // and falling back to the amount's sign
  const typeByName = new Map(accounts.map(a => [a.name, a.type]));
  let assets = 0;
  let liabilities = 0;
  values
    .filter(v => v.date.split('T')[0] === latest.date)
    .forEach(v => {
      const type = typeByName.get(v.account_name);
      if (type === 'Liability' || (type == null && v.amount < 0)) liabilities += v.amount;
      else assets += v.amount;
    });

  return {
    latestDate: latest.date,
    netWorth: latest.total,
    assets,
    liabilities,
    monthDelta: previous
      ? makeDelta(latest.total, previous.total, `vs ${monthLabel(previous.date)}`)
      : null,
    ytdDelta: ytdBaseline
      ? makeDelta(latest.total, ytdBaseline.total, `vs ${monthLabel(ytdBaseline.date)}`)
      : null,
  };
}
