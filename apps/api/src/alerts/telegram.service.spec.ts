import type { AnalysisResult, JudgeVerdict } from '@santara/shared';
import { formatAlert, shouldAlert } from './telegram.service';

const verdict = (overrides: Partial<JudgeVerdict> = {}): JudgeVerdict => ({
  recommendation: 'neutral',
  score: 0,
  confidence: 0.6,
  drivers: [],
  anomalies: [],
  executiveSummary: 'BBCA looks fine.',
  keyMetrics: [
    { label: 'P/E vs peers', value: '21.4x vs 10.8x', tone: 'negative' },
  ],
  ...overrides,
});

const result = (v: JudgeVerdict | null): AnalysisResult => ({
  id: 'a1',
  status: 'completed',
  company: { ticker: 'BBCA', name: 'Bank Central Asia', exchange: 'IDX' },
  query: null,
  createdAt: new Date(0).toISOString(),
  completedAt: new Date(0).toISOString(),
  ownership: null,
  flows: null,
  fundamentals: null,
  verdict: v,
  traces: [],
  error: null,
});

describe('telegram alert rules', () => {
  it('stays quiet on a neutral verdict with no high-severity anomaly', () => {
    expect(shouldAlert(result(verdict()))).toBe(false);
    expect(shouldAlert(result(null))).toBe(false);
  });

  it('alerts on conviction scores and on high-severity anomalies', () => {
    expect(
      shouldAlert(result(verdict({ score: 42, recommendation: 'bullish' }))),
    ).toBe(true);
    expect(
      shouldAlert(result(verdict({ score: -33, recommendation: 'bearish' }))),
    ).toBe(true);
    expect(
      shouldAlert(
        result(
          verdict({
            anomalies: [
              {
                code: 'earnings-flow-divergence',
                severity: 'high',
                message: 'x',
              },
            ],
          }),
        ),
      ),
    ).toBe(true);
  });

  it('formats a message with ticker, verdict and key metrics', () => {
    const message = formatAlert(
      result(verdict({ score: 42, recommendation: 'bullish' })),
    );
    expect(message).toContain('BBCA (IDX)');
    expect(message).toContain('BULLISH | score 42 | confidence 60%');
    expect(message).toContain('P/E vs peers: 21.4x vs 10.8x');
  });
});
