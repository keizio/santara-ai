import { z } from 'zod';
import {
  confidenceFromCoverage,
  scoreCompany,
  type FlowReport,
  type FundamentalsReport,
  type JudgeVerdict,
  type OwnershipReport,
} from '@santara/shared';
import type { SantaraAgents } from '../agents';
import type { AgentsConfig } from '../config';

const judgeNarrativeSchema = z.object({
  executiveSummary: z.string(),
  drivers: z.array(z.string()).max(6),
});

const compact = (value: number | null): string => {
  if (value === null) return 'n/a';
  const abs = Math.abs(value);
  const [divisor, suffix] =
    abs >= 1e12 ? [1e12, 'T'] : abs >= 1e9 ? [1e9, 'B'] : abs >= 1e6 ? [1e6, 'M'] : [1, ''];
  return `${(value / divisor).toFixed(abs >= 1e6 ? 2 : 0)}${suffix}`;
};

function keyMetrics(input: {
  ownership: OwnershipReport | null;
  flows: FlowReport | null;
  fundamentals: FundamentalsReport | null;
}): JudgeVerdict['keyMetrics'] {
  const metrics: JudgeVerdict['keyMetrics'] = [];

  if (input.fundamentals) {
    const f = input.fundamentals;
    metrics.push({
      label: 'P/E vs peers',
      value: `${f.ratios.pe?.toFixed(1) ?? 'n/a'}x vs ${f.peerMedian.pe?.toFixed(1) ?? 'n/a'}x`,
      tone:
        f.valuationStance === 'undervalued'
          ? 'positive'
          : f.valuationStance === 'overvalued'
            ? 'negative'
            : 'neutral',
    });
    metrics.push({
      label: 'Earnings YoY',
      value: `${(f.earningsGrowthYoy ?? 0).toFixed(1)}%`,
      tone: (f.earningsGrowthYoy ?? 0) >= 0 ? 'positive' : 'negative',
    });
    metrics.push({
      label: 'Health score',
      value: `${f.healthScore}/100`,
      tone: f.healthScore >= 60 ? 'positive' : f.healthScore <= 40 ? 'negative' : 'neutral',
    });
  }

  if (input.flows) {
    metrics.push({
      label: `Foreign net flow (${input.flows.windowDays}d)`,
      value: compact(input.flows.netFlow),
      tone: input.flows.netFlow >= 0 ? 'positive' : 'negative',
    });
  }

  if (input.ownership) {
    metrics.push({
      label: 'Public float',
      value: `${input.ownership.publicFloatPercent.toFixed(1)}%`,
      tone: input.ownership.publicFloatPercent >= 20 ? 'positive' : 'negative',
    });
    metrics.push({
      label: 'Ultimate parent',
      value: input.ownership.ultimateParent ?? 'Dispersed',
      tone: 'neutral',
    });
  }

  return metrics;
}

function deterministicSummary(
  ticker: string,
  breakdown: ReturnType<typeof scoreCompany>,
  input: {
    ownership: OwnershipReport | null;
    flows: FlowReport | null;
    fundamentals: FundamentalsReport | null;
  },
): string {
  const parts = [
    `${ticker} scores ${breakdown.total} (${breakdown.recommendation.replace('-', ' ')}) on the Santara rule: fundamentals ${breakdown.fundamentals >= 0 ? '+' : ''}${breakdown.fundamentals}, flows ${breakdown.flows >= 0 ? '+' : ''}${breakdown.flows}, ownership ${breakdown.ownership >= 0 ? '+' : ''}${breakdown.ownership}.`,
  ];
  if (input.fundamentals) parts.push(input.fundamentals.narrative);
  if (input.flows) parts.push(input.flows.narrative);
  if (input.ownership) parts.push(input.ownership.narrative);
  if (breakdown.anomalies.length > 0) {
    parts.push(`Anomalies: ${breakdown.anomalies.map((a) => a.message).join('; ')}.`);
  }
  return parts.join(' ');
}

/**
 * Produces the final verdict. The score, recommendation and anomalies always
 * come from the deterministic house rule in @santara/shared; the LLM only
 * rewrites the summary so results stay reproducible and auditable.
 */
export async function reconcile(
  ticker: string,
  input: {
    ownership: OwnershipReport | null;
    flows: FlowReport | null;
    fundamentals: FundamentalsReport | null;
  },
  options: { config: AgentsConfig; agents: SantaraAgents; usedFixtures: boolean },
): Promise<JudgeVerdict> {
  const breakdown = scoreCompany(input);
  const base: JudgeVerdict = {
    recommendation: breakdown.recommendation,
    score: breakdown.total,
    confidence: confidenceFromCoverage({ ...input, usedFixtures: options.usedFixtures }),
    drivers: breakdown.drivers,
    anomalies: breakdown.anomalies,
    executiveSummary: deterministicSummary(ticker, breakdown, input),
    keyMetrics: keyMetrics(input),
  };

  if (options.config.deterministicFallback) return base;

  try {
    const result = await options.agents.judge.generate(
      [
        `Ticker: ${ticker}`,
        `House score: ${breakdown.total} → ${breakdown.recommendation}`,
        `Component scores: fundamentals ${breakdown.fundamentals}, flows ${breakdown.flows}, ownership ${breakdown.ownership}`,
        `Anomalies: ${breakdown.anomalies.map((a) => `[${a.severity}] ${a.message}`).join(' | ') || 'none'}`,
        '',
        `Ownership report: ${JSON.stringify(input.ownership?.narrative ?? null)}`,
        `Flow report: ${JSON.stringify(input.flows?.narrative ?? null)}`,
        `Fundamentals report: ${JSON.stringify(input.fundamentals?.narrative ?? null)}`,
      ].join('\n'),
      { structuredOutput: { schema: judgeNarrativeSchema } },
    );
    return {
      ...base,
      executiveSummary: result.object.executiveSummary || base.executiveSummary,
      drivers: result.object.drivers.length > 0 ? result.object.drivers : base.drivers,
    };
  } catch {
    return base;
  }
}
