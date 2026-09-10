import type { FlowReport } from '@santara/shared';
import { compactCurrency } from '@/lib/format';

const TREND_CLASS = {
  accumulation: 'bg-emerald-500/15 text-emerald-300',
  distribution: 'bg-rose-500/15 text-rose-300',
  neutral: 'bg-slate-500/15 text-slate-300',
} as const;

const WIDTH = 720;
const HEIGHT = 180;

export function FlowPanel({ report }: { report: FlowReport }) {
  const series = report.cumulativeSeries;
  const maxAbs = Math.max(1, ...series.map((point) => Math.abs(point.netFlow)));
  const barWidth = WIDTH / Math.max(series.length, 1);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-100">
          Foreign flows · {report.windowDays} sessions
        </h3>
        <span className={`rounded-full px-3 py-1 text-xs ${TREND_CLASS[report.trend]}`}>
          {report.trend} · {report.abnormalityScore.toFixed(1)}σ
        </span>
      </header>

      <p className="mt-1 text-sm text-slate-400">
        Net {compactCurrency(report.netFlow)} over the window
      </p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-4 h-[180px] w-full"
        role="img"
        aria-label={`Daily foreign net flow for ${report.ticker}`}
      >
        <line x1={0} y1={HEIGHT / 2} x2={WIDTH} y2={HEIGHT / 2} className="stroke-slate-700" />
        {series.map((point, index) => {
          const height = (Math.abs(point.netFlow) / maxAbs) * (HEIGHT / 2 - 8);
          const positive = point.netFlow >= 0;
          return (
            <rect
              key={point.date}
              x={index * barWidth + barWidth * 0.15}
              y={positive ? HEIGHT / 2 - height : HEIGHT / 2}
              width={barWidth * 0.7}
              height={Math.max(height, 1)}
              className={positive ? 'fill-emerald-500/80' : 'fill-rose-500/80'}
            >
              <title>{`${point.date}: ${compactCurrency(point.netFlow)}`}</title>
            </rect>
          );
        })}
      </svg>

      <p className="mt-3 text-sm leading-relaxed text-slate-300">{report.narrative}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <BrokerList title="Top accumulating brokers" brokers={report.topBuyers} />
        <BrokerList title="Top distributing brokers" brokers={report.topSellers} />
      </div>
    </section>
  );
}

function BrokerList({
  title,
  brokers,
}: {
  title: string;
  brokers: FlowReport['topBuyers'];
}) {
  return (
    <div className="rounded-xl bg-slate-950/60 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {brokers.length === 0 && <li className="text-slate-500">No activity</li>}
        {brokers.map((broker) => (
          <li key={broker.brokerCode} className="flex justify-between gap-3">
            <span className="text-slate-300">
              {broker.brokerCode} · {broker.brokerName}
            </span>
            <span
              className={broker.side === 'accumulating' ? 'text-emerald-300' : 'text-rose-300'}
            >
              {compactCurrency(broker.netValue)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
