import type { AgentTrace } from '@santara/shared';

const AGENT_LABEL: Record<AgentTrace['agent'], string> = {
  ownership: 'Ownership & Conglomerate',
  flow: 'Flow & Sentiment',
  fundamentals: 'Fundamentals & Peers',
  judge: 'Judge / Reconciler',
};

export function AgentTraces({ traces }: { traces: AgentTrace[] }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h3 className="text-lg font-semibold text-slate-100">Agent run</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {traces.map((trace) => (
          <li
            key={trace.agent}
            className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-slate-950/60 px-3 py-2"
          >
            <span className="font-medium text-slate-100">{AGENT_LABEL[trace.agent]}</span>
            <span className="text-xs text-slate-500">
              {trace.durationMs}ms · {trace.endpoints.join(', ') || 'derived'}
              {trace.usedFixtures ? ' · fixtures' : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
