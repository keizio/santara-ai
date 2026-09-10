import type { CompanyRef, ScreenerFilter, ScreenerHit } from './market';
import type { OwnershipReport } from './ownership';
import type { FlowReport } from './flows';
import type { FundamentalsReport } from './fundamentals';

export type Recommendation =
  | 'strong-bullish'
  | 'bullish'
  | 'neutral'
  | 'bearish'
  | 'strong-bearish';

export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';

export type AgentName = 'ownership' | 'flow' | 'fundamentals' | 'judge';

export interface AgentTrace {
  agent: AgentName;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  endpoints: string[];
  usedFixtures: boolean;
}

export interface Anomaly {
  code: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface JudgeVerdict {
  recommendation: Recommendation;
  /** Composite score, -100 (max bearish) to 100 (max bullish). */
  score: number;
  confidence: number;
  drivers: string[];
  anomalies: Anomaly[];
  executiveSummary: string;
  keyMetrics: { label: string; value: string; tone: 'positive' | 'negative' | 'neutral' }[];
}

export interface AnalysisResult {
  id: string;
  status: AnalysisStatus;
  company: CompanyRef;
  query: string | null;
  createdAt: string;
  completedAt: string | null;
  ownership: OwnershipReport | null;
  flows: FlowReport | null;
  fundamentals: FundamentalsReport | null;
  verdict: JudgeVerdict | null;
  traces: AgentTrace[];
  error: string | null;
}

export interface QueryPlan {
  intent: 'single-company' | 'screen';
  tickers: string[];
  filter: ScreenerFilter;
  agents: AgentName[];
  rationale: string;
}

export interface ScreenResult {
  plan: QueryPlan;
  hits: ScreenerHit[];
}
