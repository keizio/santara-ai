import type { BrokerActivity, FlowReport, FlowTrend, ForeignFlowPoint } from '@santara/shared';
import type { SectorsBroker, SectorsForeignFlow } from '../sectors/types';

function stdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

const compact = (value: number): string => {
  const abs = Math.abs(value);
  const [divisor, suffix] =
    abs >= 1e12 ? [1e12, 'T'] : abs >= 1e9 ? [1e9, 'B'] : abs >= 1e6 ? [1e6, 'M'] : [1e3, 'K'];
  return `${(value / divisor).toFixed(2)}${suffix}`;
};

/**
 * Detects accumulation/distribution from the foreign-flow series. The
 * abnormality score is the mean of the last three sessions expressed in
 * standard deviations of the full lookback window, which is what surfaces
 * "something unusual is happening before the price moves".
 */
export function buildFlowReport(input: {
  ticker: string;
  windowDays: number;
  flows: SectorsForeignFlow[];
  brokers: SectorsBroker[];
}): FlowReport {
  const { ticker, windowDays, flows, brokers } = input;

  let cumulative = 0;
  const cumulativeSeries: ForeignFlowPoint[] = flows.map((point) => {
    cumulative += point.netFlow;
    return {
      date: point.date,
      netFlow: point.netFlow,
      cumulativeNetFlow: cumulative,
      closePrice: point.closePrice,
    };
  });

  const netFlow = cumulative;
  const values = flows.map((point) => point.netFlow);
  const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const deviation = stdDev(values, mean);
  const recent = values.slice(-3);
  const recentMean = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const abnormalityScore = deviation === 0 ? 0 : Number(((recentMean - mean) / deviation).toFixed(2));

  const threshold = Math.abs(mean) * 0.25 + deviation * 0.1;
  const trend: FlowTrend =
    recentMean > threshold ? 'accumulation' : recentMean < -threshold ? 'distribution' : 'neutral';

  const toActivity = (broker: SectorsBroker): BrokerActivity => ({
    brokerCode: broker.brokerCode,
    brokerName: broker.brokerName,
    netValue: broker.netValue,
    side: broker.netValue >= 0 ? 'accumulating' : 'distributing',
  });

  const sorted = [...brokers].sort((a, b) => b.netValue - a.netValue);
  const topBuyers = sorted.filter((b) => b.netValue > 0).slice(0, 5).map(toActivity);
  const topSellers = sorted
    .filter((b) => b.netValue < 0)
    .slice(-5)
    .reverse()
    .map(toActivity);

  const narrative = [
    `Foreign investors were net ${netFlow >= 0 ? 'buyers' : 'sellers'} of ${compact(Math.abs(netFlow))} in ${ticker} over ${windowDays} sessions.`,
    trend === 'neutral'
      ? 'Recent sessions show no directional bias.'
      : `The last three sessions point to ${trend} at ${Math.abs(abnormalityScore).toFixed(1)}σ from the window mean.`,
    topBuyers.length
      ? `Largest accumulators: ${topBuyers.map((b) => b.brokerCode).join(', ')}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    ticker,
    windowDays,
    netFlow,
    cumulativeSeries,
    trend,
    abnormalityScore,
    topBuyers,
    topSellers,
    narrative,
  };
}
