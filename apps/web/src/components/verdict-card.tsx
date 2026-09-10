import type { CompanyRef, JudgeVerdict } from '@santara/shared';
import { RECOMMENDATION_CLASS, RECOMMENDATION_LABEL, TONE_CLASS } from '@/lib/format';

const SEVERITY_CLASS = {
  high: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  low: 'border-slate-500/40 bg-slate-500/10 text-slate-200',
} as const;

export function VerdictCard({
  company,
  verdict,
}: {
  company: CompanyRef;
  verdict: JudgeVerdict;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">
            {company.ticker}
            <span className="ml-2 text-sm font-normal text-slate-400">{company.exchange}</span>
          </h2>
          <p className="text-sm text-slate-400">
            {company.name}
            {company.subSector ? ` · ${company.subSector}` : ''}
          </p>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ring-1 ${RECOMMENDATION_CLASS[verdict.recommendation]}`}
          >
            {RECOMMENDATION_LABEL[verdict.recommendation]}
          </span>
          <p className="mt-2 text-xs text-slate-400">
            Score {verdict.score} · confidence {(verdict.confidence * 100).toFixed(0)}%
          </p>
        </div>
      </header>

      <p className="mt-5 text-sm leading-relaxed text-slate-200">{verdict.executiveSummary}</p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {verdict.keyMetrics.map((metric) => (
          <div key={metric.label} className="rounded-xl bg-slate-950/60 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</dt>
            <dd className={`mt-1 text-sm font-medium ${TONE_CLASS[metric.tone]}`}>
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>

      {verdict.anomalies.length > 0 && (
        <ul className="mt-6 space-y-2">
          {verdict.anomalies.map((anomaly) => (
            <li
              key={anomaly.code}
              className={`rounded-xl border px-3 py-2 text-sm ${SEVERITY_CLASS[anomaly.severity]}`}
            >
              <span className="font-medium uppercase tracking-wide">{anomaly.severity}</span>
              <span className="ml-2">{anomaly.message}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
