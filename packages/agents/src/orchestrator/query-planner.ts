import { z } from 'zod';
import type { AgentName, QueryPlan } from '@santara/shared';
import type { SantaraAgents } from '../agents';
import type { AgentsConfig } from '../config';

export const queryPlanSchema = z.object({
  intent: z.enum(['single-company', 'screen']),
  tickers: z.array(z.string()).max(10),
  filter: z.object({
    exchange: z.enum(['IDX', 'SGX']).optional(),
    subSector: z.string().optional(),
    maxPe: z.number().optional(),
    minPe: z.number().optional(),
    maxPb: z.number().optional(),
    minMarketCap: z.number().optional(),
    minForeignNetBuy: z.number().optional(),
    lookbackDays: z.number().int().optional(),
    limit: z.number().int().optional(),
  }),
  agents: z.array(z.enum(['ownership', 'flow', 'fundamentals', 'judge'])),
  rationale: z.string(),
});

const ALL_AGENTS: AgentName[] = ['ownership', 'flow', 'fundamentals', 'judge'];

const IDX_TICKER = /\b([A-Z]{4})\b/g;
const SGX_TICKER = /\b([A-Z]\d{2}[A-Z]?)\b/g;

const STOP_WORDS = new Set(['IDX', 'SGX', 'ETF', 'IPO', 'ESG', 'GDP', 'IHSG', 'USD', 'SGD', 'IDR']);

/**
 * Only tokens the analyst typed in capitals are treated as tickers — lower-casing
 * the query would turn ordinary words like "deep dive" into IDX codes.
 */
function extractTickers(query: string): string[] {
  const found = new Set<string>();
  for (const match of query.matchAll(IDX_TICKER)) {
    if (!STOP_WORDS.has(match[1])) found.add(match[1]);
  }
  for (const match of query.matchAll(SGX_TICKER)) {
    if (!STOP_WORDS.has(match[1])) found.add(match[1]);
  }
  return [...found];
}

function extractLookback(query: string): number | undefined {
  if (/\btoday\b/i.test(query)) return 3;
  if (/\bthis week\b|\blast week\b|\b5 (sessions|days)\b/i.test(query)) return 5;
  if (/\bthis month\b|\blast month\b|\b30 days\b/i.test(query)) return 20;
  if (/\bquarter\b|\b3 months\b/i.test(query)) return 60;
  const explicit = /\blast (\d{1,2}) (?:sessions|days)\b/i.exec(query);
  return explicit ? Number(explicit[1]) : undefined;
}

/**
 * Rule-based plan used on its own when no LLM key is configured, and as the
 * seed/fallback for the LLM planner otherwise.
 */
export function planQueryDeterministic(query: string): QueryPlan {
  const tickers = extractTickers(query);
  const lookbackDays = extractLookback(query);

  const maxPe = /p\/?e (?:is )?(?:under|below|less than|<)\s*(\d+(?:\.\d+)?)/i.exec(query);
  const minPe = /p\/?e (?:is )?(?:over|above|more than|>)\s*(\d+(?:\.\d+)?)/i.exec(query);
  const maxPb = /p\/?b (?:is )?(?:under|below|less than|<)\s*(\d+(?:\.\d+)?)/i.exec(query);

  const wantsForeignBuying = /foreign(ers)?.{0,30}(buy|accumulat|inflow)/i.test(query);
  const exchange = /\bsgx\b|singapore/i.test(query)
    ? ('SGX' as const)
    : /\bidx\b|indonesi/i.test(query)
      ? ('IDX' as const)
      : undefined;

  const intent: QueryPlan['intent'] = tickers.length > 0 ? 'single-company' : 'screen';

  const agents: AgentName[] =
    intent === 'single-company'
      ? ALL_AGENTS
      : ([wantsForeignBuying ? 'flow' : null, 'fundamentals', 'judge'].filter(
          Boolean,
        ) as AgentName[]);

  return {
    intent,
    tickers,
    filter: {
      exchange,
      maxPe: maxPe ? Number(maxPe[1]) : undefined,
      minPe: minPe ? Number(minPe[1]) : undefined,
      maxPb: maxPb ? Number(maxPb[1]) : undefined,
      minForeignNetBuy: wantsForeignBuying ? 1 : undefined,
      lookbackDays: lookbackDays ?? (intent === 'screen' ? 5 : 20),
      limit: 10,
    },
    agents,
    rationale:
      intent === 'single-company'
        ? `Detected ticker(s) ${tickers.join(', ')} — running the full due-diligence pipeline.`
        : 'No ticker detected — screening the covered universe against the parsed filters.',
  };
}

export async function planQuery(
  query: string,
  options: { config: AgentsConfig; agents: SantaraAgents },
): Promise<QueryPlan> {
  const deterministic = planQueryDeterministic(query);
  if (options.config.deterministicFallback) return deterministic;

  try {
    const result = await options.agents.planner.generate(
      `Analyst question: "${query}"\n\nRule-based draft plan (correct it where the question implies something different):\n${JSON.stringify(
        deterministic,
        null,
        2,
      )}`,
      { structuredOutput: { schema: queryPlanSchema } },
    );
    const plan = result.object;
    return {
      ...plan,
      tickers: plan.tickers.map((ticker: string) => ticker.toUpperCase()),
      agents: plan.agents.length > 0 ? plan.agents : deterministic.agents,
    };
  } catch {
    // A planner failure must never take the pipeline down — the rule-based
    // plan is always a valid execution plan.
    return deterministic;
  }
}
