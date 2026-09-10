import type { FlowReport } from './types/flows';
import type { FundamentalsReport } from './types/fundamentals';
import type { OwnershipReport } from './types/ownership';
import type { Anomaly, Recommendation } from './types/analysis';

export interface ScoreBreakdown {
  fundamentals: number;
  flows: number;
  ownership: number;
  total: number;
  recommendation: Recommendation;
  drivers: string[];
  anomalies: Anomaly[];
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export function recommendationFromScore(score: number): Recommendation {
  if (score >= 55) return 'strong-bullish';
  if (score >= 20) return 'bullish';
  if (score > -20) return 'neutral';
  if (score > -55) return 'bearish';
  return 'strong-bearish';
}

/**
 * Deterministic house scoring rule used by the Judge agent. The LLM may
 * re-word the narrative but the numeric verdict always comes from here so
 * recommendations stay reproducible and auditable.
 */
export function scoreCompany(input: {
  ownership: OwnershipReport | null;
  flows: FlowReport | null;
  fundamentals: FundamentalsReport | null;
}): ScoreBreakdown {
  const drivers: string[] = [];
  const anomalies: Anomaly[] = [];

  let fundamentalsScore = 0;
  if (input.fundamentals) {
    const f = input.fundamentals;
    fundamentalsScore += clamp((f.healthScore - 50) * 0.6, -30, 30);
    if (f.peDiscountToPeers !== null) {
      fundamentalsScore += clamp(f.peDiscountToPeers * 0.5, -20, 20);
      if (f.peDiscountToPeers >= 20) {
        drivers.push(
          `Trades at a ${f.peDiscountToPeers.toFixed(0)}% P/E discount to ${f.subSector} peers`,
        );
      } else if (f.peDiscountToPeers <= -20) {
        drivers.push(
          `Trades at a ${Math.abs(f.peDiscountToPeers).toFixed(0)}% P/E premium to ${f.subSector} peers`,
        );
      }
    }
    if ((f.earningsGrowthYoy ?? 0) >= 15) {
      drivers.push(`Earnings up ${f.earningsGrowthYoy?.toFixed(0)}% YoY`);
    }
    if ((f.earningsGrowthYoy ?? 0) <= -15) {
      drivers.push(`Earnings down ${Math.abs(f.earningsGrowthYoy ?? 0).toFixed(0)}% YoY`);
    }
  }

  let flowScore = 0;
  if (input.flows) {
    const fl = input.flows;
    const direction = fl.trend === 'accumulation' ? 1 : fl.trend === 'distribution' ? -1 : 0;
    flowScore = clamp(direction * (10 + Math.abs(fl.abnormalityScore) * 10), -35, 35);
    if (direction > 0) {
      drivers.push(`Foreign investors net buyers over the last ${fl.windowDays} sessions`);
    } else if (direction < 0) {
      drivers.push(`Foreign investors net sellers over the last ${fl.windowDays} sessions`);
    }
    if (Math.abs(fl.abnormalityScore) >= 2) {
      anomalies.push({
        code: 'abnormal-flow',
        severity: 'medium',
        message: `Foreign flow is ${fl.abnormalityScore.toFixed(1)} standard deviations from its ${fl.windowDays}-day mean`,
      });
    }
  }

  let ownershipScore = 0;
  if (input.ownership) {
    const o = input.ownership;
    if (o.topHolderConcentration >= 75) {
      ownershipScore -= 12;
      anomalies.push({
        code: 'ownership-concentration',
        severity: 'high',
        message: `Top holders control ${o.topHolderConcentration.toFixed(1)}% of shares, leaving a thin float`,
      });
    } else if (o.topHolderConcentration >= 60) {
      ownershipScore -= 6;
    }
    if (o.publicFloatPercent <= 10) {
      ownershipScore -= 8;
      anomalies.push({
        code: 'thin-float',
        severity: 'medium',
        message: `Public float of ${o.publicFloatPercent.toFixed(1)}% makes the price susceptible to single-broker moves`,
      });
    }
    if (o.conglomerate && o.sisterCompanies.length >= 3) {
      ownershipScore -= 4;
      drivers.push(
        `Part of ${o.conglomerate.name} with ${o.sisterCompanies.length} listed sister companies (cross-holding risk)`,
      );
    }
  }

  if (
    input.fundamentals &&
    input.flows &&
    (input.fundamentals.earningsGrowthYoy ?? 0) > 10 &&
    input.flows.trend === 'distribution'
  ) {
    anomalies.push({
      code: 'earnings-flow-divergence',
      severity: 'high',
      message:
        'Earnings are growing while foreign investors distribute — the market is pricing something the income statement does not show yet',
    });
  }

  if (
    input.fundamentals &&
    input.flows &&
    (input.fundamentals.earningsGrowthYoy ?? 0) < -10 &&
    input.flows.trend === 'accumulation'
  ) {
    anomalies.push({
      code: 'flow-earnings-divergence',
      severity: 'medium',
      message:
        'Foreign accumulation despite shrinking earnings — possible turnaround positioning or index-driven buying',
    });
  }

  const total = clamp(Math.round(fundamentalsScore + flowScore + ownershipScore), -100, 100);

  return {
    fundamentals: Math.round(fundamentalsScore),
    flows: Math.round(flowScore),
    ownership: Math.round(ownershipScore),
    total,
    recommendation: recommendationFromScore(total),
    drivers,
    anomalies,
  };
}

export function confidenceFromCoverage(input: {
  ownership: unknown;
  flows: unknown;
  fundamentals: unknown;
  usedFixtures: boolean;
}): number {
  const covered = [input.ownership, input.flows, input.fundamentals].filter(Boolean).length;
  const base = covered / 3;
  return Number((input.usedFixtures ? base * 0.6 : base * 0.95).toFixed(2));
}
