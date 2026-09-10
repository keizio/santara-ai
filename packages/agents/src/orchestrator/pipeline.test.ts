import { expect, test } from 'vitest';
import { SantaraEngine } from './pipeline';
import { loadAgentsConfig } from '../config';

const engine = new SantaraEngine({
  ...loadAgentsConfig(),
  useFixtures: true,
  deterministicFallback: true,
});

test('analyses a ticker end to end without any API keys', async () => {
  const payload = await engine.analyze({ ticker: 'bbca' });

  expect(payload.company.ticker).toBe('BBCA');
  expect(payload.usedFixtures).toBe(true);
  expect(payload.ownership?.ultimateParent).toBeTruthy();
  expect(payload.flows?.cumulativeSeries).toHaveLength(20);
  expect(payload.fundamentals?.peers.length ?? 0).toBeGreaterThan(0);
  expect(payload.verdict?.executiveSummary).toContain('BBCA');
  expect(payload.traces.map((trace) => trace.agent).sort()).toEqual([
    'flow',
    'fundamentals',
    'judge',
    'ownership',
  ]);
});

test('is deterministic across runs', async () => {
  const [first, second] = await Promise.all([
    engine.analyze({ ticker: 'INDF' }),
    engine.analyze({ ticker: 'INDF' }),
  ]);

  expect(first.verdict?.score).toBe(second.verdict?.score);
  expect(first.verdict?.recommendation).toBe(second.verdict?.recommendation);
});

test('screens the universe from a natural language query', async () => {
  const plan = await engine.plan('IDX stocks with foreign buying this week and P/E under 10');
  const { hits } = await engine.screen(plan);

  expect(hits.length).toBeGreaterThan(0);
  for (const hit of hits) {
    expect(hit.exchange).toBe('IDX');
    expect(hit.pe === null || hit.pe <= 10).toBe(true);
  }
});
