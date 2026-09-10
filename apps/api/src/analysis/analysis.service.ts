import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SantaraEngine, SectorsNotFoundError } from '@santara/agents';
import type {
  AnalysisResult,
  CompanyRef,
  QueryPlan,
  ScreenResult,
  ScreenerFilter,
} from '@santara/shared';
import { SANTARA_ENGINE } from '../engine/engine.module';
import { TelegramService } from '../alerts/telegram.service';
import { AnalysisRunEntity } from './entities/analysis-run.entity';
import { CompanyEntity } from './entities/company.entity';
import type { CreateAnalysisDto, ScreenDto } from './dto/analysis.dto';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    @Inject(SANTARA_ENGINE) private readonly engine: SantaraEngine,
    @InjectRepository(AnalysisRunEntity)
    private readonly runs: Repository<AnalysisRunEntity>,
    @InjectRepository(CompanyEntity)
    private readonly companies: Repository<CompanyEntity>,
    private readonly telegram: TelegramService,
  ) {}

  get usesFixtures(): boolean {
    return this.engine.usesFixtures;
  }

  plan(query: string): Promise<QueryPlan> {
    return this.engine.plan(query);
  }

  async screen(dto: ScreenDto): Promise<ScreenResult> {
    if (dto.query) {
      const plan = await this.engine.plan(dto.query);
      return this.engine.screen({
        ...plan,
        filter: { ...plan.filter, ...stripUndefined(dto) },
      });
    }
    const filter: ScreenerFilter = stripUndefined(dto);
    return this.engine.screen({
      intent: 'screen',
      tickers: [],
      filter: { limit: 10, lookbackDays: 20, ...filter },
      agents: ['flow', 'fundamentals', 'judge'],
      rationale: 'Structured filter supplied directly by the client.',
    });
  }

  async listCompanies(filter: ScreenerFilter): Promise<CompanyRef[]> {
    const companies = await this.engine.companies(filter);
    await this.cacheCompanies(companies);
    return companies;
  }

  async create(dto: CreateAnalysisDto): Promise<AnalysisResult> {
    const ticker =
      dto.ticker?.toUpperCase() ?? (await this.resolveTicker(dto.query ?? ''));
    const createdAt = new Date();

    try {
      const payload = await this.engine.analyze({
        ticker,
        query: dto.query ?? null,
        windowDays: dto.windowDays,
      });

      const saved = await this.runs.save(
        this.runs.create({
          ticker: payload.company.ticker,
          query: dto.query ?? null,
          company: payload.company,
          recommendation: payload.verdict?.recommendation ?? 'neutral',
          score: payload.verdict?.score ?? 0,
          confidence: String(payload.verdict?.confidence ?? 0),
          usedFixtures: payload.usedFixtures,
          ownership: payload.ownership,
          flows: payload.flows,
          fundamentals: payload.fundamentals,
          verdict: payload.verdict!,
          traces: payload.traces,
        }),
      );

      await this.cacheCompanies([payload.company]);
      const result = toAnalysisResult(saved, createdAt);
      await this.telegram.notifyAnalysis(result);
      return result;
    } catch (error) {
      if (error instanceof SectorsNotFoundError) {
        throw new NotFoundException(`Unknown ticker: ${ticker}`);
      }
      throw error;
    }
  }

  async findOne(id: string): Promise<AnalysisResult> {
    const run = await this.runs.findOne({ where: { id } });
    if (!run) throw new NotFoundException(`Analysis ${id} not found`);
    return toAnalysisResult(run);
  }

  async list(options: {
    ticker?: string;
    limit?: number;
  }): Promise<AnalysisResult[]> {
    const runs = await this.runs.find({
      where: options.ticker ? { ticker: options.ticker.toUpperCase() } : {},
      order: { createdAt: 'DESC' },
      take: options.limit ?? 20,
    });
    return runs.map((run) => toAnalysisResult(run));
  }

  /** Natural-language entry point: plan the query, then analyse the first ticker it names. */
  private async resolveTicker(query: string): Promise<string> {
    const plan = await this.engine.plan(query);
    if (plan.tickers.length > 0) return plan.tickers[0];

    const { hits } = await this.engine.screen(plan);
    if (hits.length === 0) {
      throw new BadRequestException(
        'No ticker found in the query and no company matched the parsed filters.',
      );
    }
    return hits[0].ticker;
  }

  private async cacheCompanies(companies: CompanyRef[]): Promise<void> {
    if (companies.length === 0) return;
    try {
      await this.companies.upsert(
        companies.map((company) => ({
          ticker: company.ticker,
          name: company.name,
          exchange: company.exchange,
          subSector: company.subSector ?? 'Unknown',
          conglomerate: company.conglomerate ?? null,
          marketCap:
            company.marketCap == null ? null : String(company.marketCap),
        })),
        ['ticker'],
      );
    } catch (error) {
      // The universe cache is a convenience, never a reason to fail a request.
      this.logger.warn(
        `Company cache update failed: ${(error as Error).message}`,
      );
    }
  }
}

function stripUndefined(dto: ScreenDto): ScreenerFilter {
  const rest = { ...dto, query: undefined };
  return Object.fromEntries(
    Object.entries(rest).filter(([, value]) => value !== undefined),
  );
}

function toAnalysisResult(
  run: AnalysisRunEntity,
  createdAt?: Date,
): AnalysisResult {
  return {
    id: run.id,
    status: 'completed',
    company: run.company,
    query: run.query,
    createdAt: (createdAt ?? run.createdAt).toISOString(),
    completedAt: run.createdAt.toISOString(),
    ownership: run.ownership,
    flows: run.flows,
    fundamentals: run.fundamentals,
    verdict: run.verdict,
    traces: run.traces,
    error: null,
  };
}
