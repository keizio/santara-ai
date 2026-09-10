import type {
  AgentName,
  AgentTrace,
  CompanyRef,
  FlowReport,
  FundamentalsReport,
  JudgeVerdict,
  OwnershipReport,
  QueryPlan,
  ScreenerFilter,
  ScreenResult,
} from '@santara/shared';
import { loadAgentsConfig, type AgentsConfig } from '../config';
import { createSantaraDataSource } from '../sectors';
import type { SectorsDataSource } from '../sectors/data-source';
import { createSantaraAgents, type SantaraAgents } from '../agents';
import { AGENT_ENDPOINTS, buildFlows, buildFundamentals, buildOwnership, runScreener } from '../tools';
import { planQuery } from './query-planner';
import { reconcile } from './judge';

export interface AnalysisPayload {
  company: CompanyRef;
  ownership: OwnershipReport | null;
  flows: FlowReport | null;
  fundamentals: FundamentalsReport | null;
  verdict: JudgeVerdict | null;
  traces: AgentTrace[];
  usedFixtures: boolean;
}

export interface AnalyzeOptions {
  ticker: string;
  query?: string | null;
  windowDays?: number;
  agents?: AgentName[];
}

const DEFAULT_AGENTS: AgentName[] = ['ownership', 'flow', 'fundamentals', 'judge'];

/**
 * Orchestrator for the four specialist agents. Data derivation is always
 * deterministic; the LLM layer only rewrites narratives, so the engine works
 * end to end with neither a Sectors key nor an OpenAI key configured.
 */
export class SantaraEngine {
  readonly config: AgentsConfig;
  private readonly dataSource: SectorsDataSource;
  private readonly agents: SantaraAgents;

  constructor(config: AgentsConfig = loadAgentsConfig(), dataSource?: SectorsDataSource) {
    this.config = config;
    this.dataSource = dataSource ?? createSantaraDataSource(config);
    this.agents = createSantaraAgents(config, this.dataSource);
  }

  get usesFixtures(): boolean {
    return this.dataSource.usesFixtures;
  }

  async companies(filter: ScreenerFilter = {}): Promise<CompanyRef[]> {
    const companies = await this.dataSource.listCompanies(filter);
    return companies.map((company) => ({
      ticker: company.ticker,
      name: company.name,
      exchange: company.exchange,
      subSector: company.subSector,
      sector: company.sector,
      marketCap: company.marketCap,
    }));
  }

  plan(query: string): Promise<QueryPlan> {
    return planQuery(query, { config: this.config, agents: this.agents });
  }

  async screen(plan: QueryPlan): Promise<ScreenResult> {
    const hits = await runScreener(this.dataSource, {
      exchange: plan.filter.exchange,
      subSector: plan.filter.subSector,
      maxPe: plan.filter.maxPe,
      minForeignNetBuy: plan.filter.minForeignNetBuy,
      lookbackDays: plan.filter.lookbackDays,
      limit: plan.filter.limit,
    });
    return { plan, hits };
  }

  async analyze(options: AnalyzeOptions): Promise<AnalysisPayload> {
    const ticker = options.ticker.toUpperCase();
    const windowDays = options.windowDays ?? 20;
    const requested = new Set(options.agents ?? DEFAULT_AGENTS);
    const traces: AgentTrace[] = [];

    const company = await this.dataSource.getCompany(ticker);

    const run = async <T>(agent: AgentName, task: () => Promise<T>): Promise<T | null> => {
      if (!requested.has(agent)) return null;
      const startedAt = new Date();
      const value = await task();
      const finishedAt = new Date();
      traces.push({
        agent,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        endpoints: [...AGENT_ENDPOINTS[agent]],
        usedFixtures: this.dataSource.usesFixtures,
      });
      return value;
    };

    // The three specialists are independent — fan them out.
    const [ownership, flows, fundamentals] = await Promise.all([
      run('ownership', () => buildOwnership(this.dataSource, ticker)),
      run('flow', () => buildFlows(this.dataSource, ticker, windowDays)),
      run('fundamentals', () => buildFundamentals(this.dataSource, ticker)),
    ]);

    await this.refineNarratives({ ownership, flows, fundamentals });

    const verdict = await run('judge', () =>
      reconcile(
        ticker,
        { ownership, flows, fundamentals },
        { config: this.config, agents: this.agents, usedFixtures: this.dataSource.usesFixtures },
      ),
    );

    return {
      company: {
        ticker: company.ticker,
        name: company.name,
        exchange: company.exchange,
        sector: company.sector,
        subSector: company.subSector,
      },
      ownership,
      flows,
      fundamentals,
      verdict,
      traces,
      usedFixtures: this.dataSource.usesFixtures,
    };
  }

  /** Replaces the template narratives with LLM prose when a model is available. */
  private async refineNarratives(reports: {
    ownership: OwnershipReport | null;
    flows: FlowReport | null;
    fundamentals: FundamentalsReport | null;
  }): Promise<void> {
    if (this.config.deterministicFallback) return;

    const jobs: Promise<void>[] = [];
    const refine = async (
      agent: SantaraAgents[keyof SantaraAgents],
      report: { narrative: string } | null,
      label: string,
    ): Promise<void> => {
      if (!report) return;
      try {
        const result = await agent.generate(
          `Summarise this ${label} report for an analyst in at most three sentences:\n${JSON.stringify(report)}`,
        );
        if (result.text.trim()) report.narrative = result.text.trim();
      } catch {
        // Keep the deterministic narrative if the model call fails.
      }
    };

    jobs.push(refine(this.agents.ownership, reports.ownership, 'ownership'));
    jobs.push(refine(this.agents.flow, reports.flows, 'foreign flow'));
    jobs.push(refine(this.agents.fundamentals, reports.fundamentals, 'fundamentals'));
    await Promise.all(jobs);
  }
}
