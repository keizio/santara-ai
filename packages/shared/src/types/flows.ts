export interface ForeignFlowPoint {
  date: string;
  netFlow: number;
  cumulativeNetFlow: number;
  closePrice: number | null;
}

export interface BrokerActivity {
  brokerCode: string;
  brokerName: string;
  netValue: number;
  side: 'accumulating' | 'distributing';
}

export type FlowTrend = 'accumulation' | 'distribution' | 'neutral';

export interface FlowReport {
  ticker: string;
  windowDays: number;
  netFlow: number;
  cumulativeSeries: ForeignFlowPoint[];
  trend: FlowTrend;
  /** Latest net flow expressed in standard deviations of the lookback window. */
  abnormalityScore: number;
  topBuyers: BrokerActivity[];
  topSellers: BrokerActivity[];
  narrative: string;
}
