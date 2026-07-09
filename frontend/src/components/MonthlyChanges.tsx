import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonthlyChanges as Changes } from '../lib/stats';
import { fmtCurrency, fmtSigned, directionClass } from './SummaryStats';

function MonthlyChanges({ changes }: { changes: Changes }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">
          What moved
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {changes.previousLabel} → {changes.currentLabel}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                <th className="text-left font-medium py-2 pr-4">Account</th>
                <th className="text-right font-medium py-2 px-4">{changes.previousLabel}</th>
                <th className="text-right font-medium py-2 px-4">{changes.currentLabel}</th>
                <th className="text-right font-medium py-2 px-4">Change</th>
                <th className="text-right font-medium py-2 pl-4">%</th>
              </tr>
            </thead>
            <tbody>
              {changes.changes.map(c => (
                <tr key={c.name} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-4 font-medium">{c.name}</td>
                  <td className="py-2 px-4 text-right text-muted-foreground">
                    {c.previous != null ? fmtCurrency(c.previous) : '—'}
                  </td>
                  <td className="py-2 px-4 text-right">
                    {c.current != null ? fmtCurrency(c.current) : '—'}
                  </td>
                  <td className={`py-2 px-4 text-right ${c.change === 0 ? 'text-muted-foreground' : directionClass(c.change)}`}>
                    {c.change === 0 ? '—' : fmtSigned(c.change)}
                  </td>
                  <td className="py-2 pl-4 text-right text-muted-foreground">
                    {c.pct != null && c.change !== 0
                      ? `${c.pct >= 0 ? '+' : ''}${c.pct.toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td className="py-2 pr-4 font-medium">Net worth</td>
                <td className="py-2 px-4" />
                <td className="py-2 px-4" />
                <td className={`py-2 px-4 text-right font-medium ${directionClass(changes.totalChange)}`}>
                  {fmtSigned(changes.totalChange)}
                </td>
                <td className="py-2 pl-4" />
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default MonthlyChanges;
