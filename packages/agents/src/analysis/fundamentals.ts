import type {
  FundamentalsReport,
  PeerSnapshot,
  ValuationRatios,
  ValuationStance,
} from '@santara/shared';
import type { SectorsCompanyReport } from '../sectors/types';

function median(values: (number | null)[]): number | null {
  const clean = values.filter((value): value is number => value !== null).sort((a, b) => a - b);
  if (clean.length === 0) return null;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 === 0 ? (clean[middle - 1] + clean[middle]) / 2 : clean[middle];
}

function peerMedianRatios(peers: SectorsCompanyReport[]): ValuationRatios {
  return {
    pe: median(peers.map((peer) => peer.financials.pe)),
    pb: median(peers.map((peer) => peer.financials.pb)),
    evToEbitda: median(peers.map((peer) => peer.financials.evToEbitda)),
    dividendYield: median(peers.map((peer) => peer.financials.dividendYield)),
    roe: median(peers.map((peer) => peer.financials.roe)),
    debtToEquity: median(peers.map((peer) => peer.financials.debtToEquity)),
  };
}

const score = (value: number | null, bands: [number, number][], points: number[]): number => {
  if (value === null) return 0;
  for (let i = 0; i < bands.length; i += 1) {
    const [low, high] = bands[i];
    if (value >= low && value < high) return points[i];
  }
  return points[points.length - 1];
};

/**
 * Blends profitability, leverage and growth into a 0-100 health score, then
 * positions the ratios against the sub-sector peer median.
 */
export function buildFundamentalsReport(input: {
  target: SectorsCompanyReport;
  peers: SectorsCompanyReport[];
}): FundamentalsReport {
  const { target, peers } = input;
  const ratios: ValuationRatios = {
    pe: target.financials.pe,
    pb: target.financials.pb,
    evToEbitda: target.financials.evToEbitda,
    dividendYield: target.financials.dividendYield,
    roe: target.financials.roe,
    debtToEquity: target.financials.debtToEquity,
  };

  const peerMedian = peerMedianRatios(peers);

  const peDiscountToPeers =
    ratios.pe !== null && peerMedian.pe !== null && peerMedian.pe !== 0
      ? Number((((peerMedian.pe - ratios.pe) / peerMedian.pe) * 100).toFixed(1))
      : null;

  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        40 +
          score(ratios.roe, [[-Infinity, 5], [5, 12], [12, 18], [18, Infinity]], [-15, 0, 10, 20]) +
          score(
            ratios.debtToEquity,
            [[-Infinity, 0.4], [0.4, 1], [1, 2], [2, Infinity]],
            [12, 6, -4, -14],
          ) +
          score(
            target.financials.earningsGrowthYoy,
            [[-Infinity, -10], [-10, 0], [0, 15], [15, Infinity]],
            [-16, -6, 8, 18],
          ) +
          score(
            target.financials.revenueGrowthYoy,
            [[-Infinity, 0], [0, 5], [5, 12], [12, Infinity]],
            [-8, 0, 5, 10],
          ),
      ),
    ),
  );

  const valuationStance: ValuationStance =
    peDiscountToPeers === null
      ? 'fairly-valued'
      : peDiscountToPeers >= 15
        ? 'undervalued'
        : peDiscountToPeers <= -15
          ? 'overvalued'
          : 'fairly-valued';

  const peerSnapshots: PeerSnapshot[] = peers.map((peer) => ({
    ticker: peer.company.ticker,
    name: peer.company.name,
    marketCap: peer.company.marketCap,
    ratios: {
      pe: peer.financials.pe,
      pb: peer.financials.pb,
      evToEbitda: peer.financials.evToEbitda,
      dividendYield: peer.financials.dividendYield,
      roe: peer.financials.roe,
      debtToEquity: peer.financials.debtToEquity,
    },
  }));

  const narrative = [
    `${target.company.ticker} trades at ${ratios.pe?.toFixed(1) ?? 'n/a'}x earnings and ${ratios.pb?.toFixed(1) ?? 'n/a'}x book`,
    peerMedian.pe !== null
      ? `against a ${target.company.subSector} peer median of ${peerMedian.pe.toFixed(1)}x`
      : 'with no peer median available',
    `ROE of ${ratios.roe?.toFixed(1) ?? 'n/a'}% and earnings ${(target.financials.earningsGrowthYoy ?? 0) >= 0 ? 'up' : 'down'} ${Math.abs(target.financials.earningsGrowthYoy ?? 0).toFixed(1)}% YoY put the health score at ${healthScore}/100.`,
  ].join(', ');

  return {
    ticker: target.company.ticker,
    name: target.company.name,
    sector: target.company.sector,
    subSector: target.company.subSector,
    marketCap: target.company.marketCap,
    ratios,
    peerMedian,
    peers: peerSnapshots,
    peDiscountToPeers,
    earningsGrowthYoy: target.financials.earningsGrowthYoy,
    revenueGrowthYoy: target.financials.revenueGrowthYoy,
    valuationStance,
    healthScore,
    narrative,
  };
}
