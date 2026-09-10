'use client';

import { useState, useTransition } from 'react';
import type { AnalysisResult, CompanyRef, ScreenResult } from '@santara/shared';
import { api, ApiError } from '@/lib/api';
import { AgentTraces } from './agent-traces';
import { FlowPanel } from './flow-panel';
import { FundamentalsPanel } from './fundamentals-panel';
import { OwnershipGraph } from './ownership-graph';
import { ScreenerTable } from './screener-table';
import { VerdictCard } from './verdict-card';

const EXAMPLES = [
  'Show me IDX stocks where foreign investors are buying heavily this week but P/E is under 10',
  'Deep dive BBCA ownership and foreign flows',
  'Which SGX banks look undervalued versus peers?',
];

/** A screening question returns a table; a ticker question runs the full agent pipeline. */
export function Dashboard({ companies, usesFixtures }: { companies: CompanyRef[]; usesFixtures: boolean }) {
  const [query, setQuery] = useState(EXAMPLES[0]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [screen, setScreen] = useState<ScreenResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (input: { query?: string; ticker?: string }) => {
    setError(null);
    startTransition(async () => {
      try {
        if (input.ticker) {
          setScreen(null);
          setAnalysis(await api.analyze({ ticker: input.ticker }));
          return;
        }

        const plan = await api.plan(input.query ?? '');
        if (plan.intent === 'single-company' && plan.tickers.length > 0) {
          setScreen(null);
          setAnalysis(await api.analyze({ ticker: plan.tickers[0], query: input.query }));
          return;
        }

        setAnalysis(null);
        setScreen(await api.screen(input.query ?? ''));
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : 'The API is unreachable.');
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Santara AI</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-50">
          Conglomerate &amp; foreign flow intelligence
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Multi-agent due diligence for IDX and SGX equities: ownership trees, foreign capital
          flows, peer valuation and a reconciled verdict.
          {usesFixtures && ' Running on bundled fixture data — set SECTORS_API_KEY for live data.'}
        </p>
      </header>

      <form
        className="mt-8 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          run({ query });
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask about a ticker or screen the market…"
          className="flex-1 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-50"
        >
          {pending ? 'Running agents…' : 'Analyse'}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setQuery(example);
              run({ query: example });
            }}
            className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400 hover:border-sky-500 hover:text-sky-300"
          >
            {example}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {companies.map((company) => (
          <button
            key={company.ticker}
            type="button"
            onClick={() => run({ ticker: company.ticker })}
            className="rounded-lg bg-slate-900 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            title={company.name}
          >
            {company.ticker}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      <div className="mt-8 space-y-6">
        {screen && <ScreenerTable result={screen} onSelect={(ticker) => run({ ticker })} />}

        {analysis?.verdict && <VerdictCard company={analysis.company} verdict={analysis.verdict} />}
        {analysis?.ownership && <OwnershipGraph report={analysis.ownership} />}
        {analysis?.flows && <FlowPanel report={analysis.flows} />}
        {analysis?.fundamentals && <FundamentalsPanel report={analysis.fundamentals} />}
        {analysis && analysis.traces.length > 0 && <AgentTraces traces={analysis.traces} />}
      </div>
    </div>
  );
}
