export interface ValuationRatios {
  pe: number | null;
  pb: number | null;
  evToEbitda: number | null;
  dividendYield: number | null;
  roe: number | null;
  debtToEquity: number | null;
}

export interface PeerSnapshot {
  ticker: string;
  name: string;
  marketCap: number | null;
  ratios: ValuationRatios;
}

export type ValuationStance = 'undervalued' | 'fairly-valued' | 'overvalued';

export interface FundamentalsReport {
  ticker: string;
  name: string;
  sector: string;
  subSector: string;
  marketCap: number | null;
  ratios: ValuationRatios;
  peerMedian: ValuationRatios;
  peers: PeerSnapshot[];
  /** Percentage discount (positive) or premium (negative) vs. the peer median P/E. */
  peDiscountToPeers: number | null;
  earningsGrowthYoy: number | null;
  revenueGrowthYoy: number | null;
  valuationStance: ValuationStance;
  healthScore: number;
  narrative: string;
}
