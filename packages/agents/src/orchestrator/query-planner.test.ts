import { expect, test } from 'vitest';
import { planQueryDeterministic } from './query-planner';

test('screens the market when the question names no ticker', () => {
  const plan = planQueryDeterministic(
    'Show me IDX stocks where foreign investors are buying heavily this week but P/E is under 10',
  );

  expect(plan.intent).toBe('screen');
  expect(plan.tickers).toEqual([]);
  expect(plan.filter.exchange).toBe('IDX');
  expect(plan.filter.maxPe).toBe(10);
  expect(plan.filter.lookbackDays).toBe(5);
  expect(plan.filter.minForeignNetBuy ?? 0).toBeGreaterThan(0);
});

test('routes to a single-company deep dive when a ticker is present', () => {
  const plan = planQueryDeterministic('Deep dive BBCA ownership and foreign flows this month');

  expect(plan.intent).toBe('single-company');
  expect(plan.tickers).toEqual(['BBCA']);
  expect(plan.filter.lookbackDays).toBe(20);
  expect(plan.agents).toContain('ownership');
});

test('ignores lower-case words and index names that look like tickers', () => {
  const plan = planQueryDeterministic('Show IDX bank stocks where foreign flows turned negative');

  expect(plan.tickers).toEqual([]);
});
