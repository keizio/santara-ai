import type { ScreenResult } from '@santara/shared';
import { compactCurrency, ratio } from '@/lib/format';

export function ScreenerTable({
  result,
  onSelect,
}: {
  result: ScreenResult;
  onSelect: (ticker: string) => void;
}) {
  const { plan, hits } = result;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <header>
        <h3 className="text-lg font-semibold text-slate-100">Screener matches</h3>
        <p className="mt-1 text-sm text-slate-400">{plan.rationale}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
          {Object.entries(plan.filter)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => (
              <span key={key} className="rounded-full bg-slate-950/70 px-3 py-1">
                {key}: {String(value)}
              </span>
            ))}
        </div>
      </header>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2">Ticker</th>
              <th className="py-2">Market cap</th>
              <th className="py-2">P/E</th>
              <th className="py-2">P/B</th>
              <th className="py-2">Foreign net flow</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {hits.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-slate-500">
                  No company matched these filters.
                </td>
              </tr>
            )}
            {hits.map((hit) => (
              <tr key={hit.ticker} className="text-slate-300">
                <td className="py-2">
                  <span className="font-medium text-slate-100">{hit.ticker}</span>
                  <span className="ml-2 text-slate-500">{hit.name}</span>
                </td>
                <td className="py-2">{compactCurrency(hit.marketCap)}</td>
                <td className="py-2">{ratio(hit.pe)}</td>
                <td className="py-2">{ratio(hit.pb)}</td>
                <td
                  className={hit.foreignNetFlow >= 0 ? 'py-2 text-emerald-300' : 'py-2 text-rose-300'}
                >
                  {compactCurrency(hit.foreignNetFlow)}
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(hit.ticker)}
                    className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-sky-500 hover:text-sky-300"
                  >
                    Deep dive
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
