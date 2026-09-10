import type { FundamentalsReport } from '@santara/shared';
import { compactCurrency, percent, ratio } from '@/lib/format';

const STANCE_CLASS = {
  undervalued: 'bg-emerald-500/15 text-emerald-300',
  'fairly-valued': 'bg-slate-500/15 text-slate-300',
  overvalued: 'bg-rose-500/15 text-rose-300',
} as const;

export function FundamentalsPanel({ report }: { report: FundamentalsReport }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-100">
          Fundamentals · {report.subSector}
        </h3>
        <span className={`rounded-full px-3 py-1 text-xs ${STANCE_CLASS[report.valuationStance]}`}>
          {report.valuationStance} · health {report.healthScore}/100
        </span>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="P/E" value={ratio(report.ratios.pe)} sub={`peers ${ratio(report.peerMedian.pe)}`} />
        <Metric label="P/B" value={ratio(report.ratios.pb)} sub={`peers ${ratio(report.peerMedian.pb)}`} />
        <Metric
          label="EV/EBITDA"
          value={ratio(report.ratios.evToEbitda)}
          sub={`peers ${ratio(report.peerMedian.evToEbitda)}`}
        />
        <Metric label="ROE" value={percent(report.ratios.roe)} sub="trailing" />
        <Metric label="Earnings YoY" value={percent(report.earningsGrowthYoy)} sub="reported" />
        <Metric
          label="P/E vs peers"
          value={report.peDiscountToPeers == null ? '—' : percent(report.peDiscountToPeers)}
          sub={report.peDiscountToPeers != null && report.peDiscountToPeers > 0 ? 'discount' : 'premium'}
        />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-300">{report.narrative}</p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2">Peer</th>
              <th className="py-2">Market cap</th>
              <th className="py-2">P/E</th>
              <th className="py-2">P/B</th>
              <th className="py-2">ROE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {report.peers.map((peer) => (
              <tr key={peer.ticker} className="text-slate-300">
                <td className="py-2">
                  <span className="font-medium text-slate-100">{peer.ticker}</span>
                  <span className="ml-2 text-slate-500">{peer.name}</span>
                </td>
                <td className="py-2">{compactCurrency(peer.marketCap)}</td>
                <td className="py-2">{ratio(peer.ratios.pe)}</td>
                <td className="py-2">{ratio(peer.ratios.pb)}</td>
                <td className="py-2">{percent(peer.ratios.roe)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-slate-950/60 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-100">{value}</p>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  );
}
