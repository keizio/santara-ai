import type { Recommendation } from '@santara/shared';

/** Indonesian market numbers run large — compact them to T/B/M. */
export function compactCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  return `${sign}${abs.toFixed(0)}`;
}

export function ratio(value: number | null | undefined): string {
  return value == null ? '—' : `${value.toFixed(1)}x`;
}

export function percent(value: number | null | undefined, digits = 1): string {
  return value == null ? '—' : `${value.toFixed(digits)}%`;
}

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  'strong-bullish': 'Strong Bullish',
  bullish: 'Bullish',
  neutral: 'Neutral',
  bearish: 'Bearish',
  'strong-bearish': 'Strong Bearish',
};

export const RECOMMENDATION_CLASS: Record<Recommendation, string> = {
  'strong-bullish': 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40',
  bullish: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  neutral: 'bg-slate-500/15 text-slate-300 ring-slate-500/40',
  bearish: 'bg-rose-500/10 text-rose-300 ring-rose-500/30',
  'strong-bearish': 'bg-rose-500/15 text-rose-300 ring-rose-500/40',
};

export const TONE_CLASS: Record<'positive' | 'negative' | 'neutral', string> = {
  positive: 'text-emerald-300',
  negative: 'text-rose-300',
  neutral: 'text-slate-200',
};
