import type { Exchange, ScreenerFilter } from '@santara/shared';
import type { AgentsConfig } from '../config';
import { SectorsNotFoundError, type SectorsDataSource } from './data-source';
import { SECTORS_ENDPOINTS } from './endpoints';
import { FixtureSectorsDataSource } from './fixtures';
import type {
  SectorsBroker,
  SectorsCompany,
  SectorsCompanyReport,
  SectorsConglomerate,
  SectorsFinancials,
  SectorsForeignFlow,
  SectorsOwnership,
  SectorsPeerComparison,
  SectorsShareholder,
} from './types';

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/**
 * Sectors.app is not perfectly consistent about field naming across endpoints
 * (`market_cap` vs `marketCap`, `pe` vs `pe_ratio`), so every read goes through
 * these tolerant accessors with an explicit list of accepted keys.
 */
function num(source: Json, keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function str(source: Json, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
}

function toExchange(value: string | null): Exchange {
  return value?.toUpperCase() === 'SGX' ? 'SGX' : 'IDX';
}

function mapCompany(raw: Json): SectorsCompany {
  return {
    ticker: (str(raw, ['symbol', 'ticker', 'company_symbol']) ?? '').toUpperCase(),
    name: str(raw, ['company_name', 'name']) ?? '',
    exchange: toExchange(str(raw, ['exchange', 'market'])),
    sector: str(raw, ['sector']) ?? 'Unknown',
    subSector: str(raw, ['sub_sector', 'subSector', 'sub_industry']) ?? 'Unknown',
    marketCap: num(raw, ['market_cap', 'marketCap', 'market_capitalization']),
  };
}

function mapFinancials(raw: Json): SectorsFinancials {
  const valuation = isRecord(raw.valuation) ? raw.valuation : raw;
  const financials = isRecord(raw.financials) ? raw.financials : raw;
  return {
    pe: num(valuation, ['pe', 'pe_ratio', 'price_earnings']),
    pb: num(valuation, ['pb', 'pb_ratio', 'price_book']),
    evToEbitda: num(valuation, ['ev_ebitda', 'ev_to_ebitda', 'enterprise_to_ebitda']),
    dividendYield: num(valuation, ['dividend_yield', 'yield']),
    roe: num(financials, ['roe', 'return_on_equity']),
    debtToEquity: num(financials, ['debt_to_equity', 'der']),
    earningsGrowthYoy: num(financials, ['earnings_yoy', 'earnings_growth_yoy', 'net_income_growth']),
    revenueGrowthYoy: num(financials, ['revenue_yoy', 'revenue_growth_yoy', 'revenue_growth']),
  };
}

function mapShareholder(raw: Json): SectorsShareholder {
  const name = str(raw, ['name', 'shareholder_name', 'holder']) ?? 'Unknown holder';
  const type = (str(raw, ['type', 'entity_type']) ?? '').toLowerCase();
  return {
    name,
    sharePercent: num(raw, ['share_percentage', 'percentage', 'share_percent']) ?? 0,
    foreign: /foreign|overseas|offshore/i.test(name) || type === 'foreign',
    entityType:
      type === 'individual' || type === 'government' || type === 'public' ? type : 'institution',
  };
}

export class SectorsHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    body: string,
  ) {
    super(`Sectors API ${status} for ${url}: ${body.slice(0, 200)}`);
    this.name = 'SectorsHttpError';
  }
}

/** Live Sectors.app REST client. */
export class SectorsApiClient implements SectorsDataSource {
  readonly usesFixtures = false;

  constructor(
    private readonly config: Pick<AgentsConfig, 'sectorsApiKey' | 'sectorsBaseUrl'>,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async get(path: string): Promise<unknown> {
    const url = `${this.config.sectorsBaseUrl.replace(/\/$/, '')}${path}`;
    const response = await this.fetchImpl(url, {
      headers: { Authorization: this.config.sectorsApiKey, Accept: 'application/json' },
    });
    if (response.status === 404) {
      throw new SectorsNotFoundError(path);
    }
    if (!response.ok) {
      throw new SectorsHttpError(response.status, url, await response.text());
    }
    return response.json();
  }

  private async getRecord(path: string): Promise<Json> {
    const payload = await this.get(path);
    if (!isRecord(payload)) {
      throw new SectorsHttpError(200, path, 'expected a JSON object');
    }
    return payload;
  }

  async listCompanies(filter?: ScreenerFilter): Promise<SectorsCompany[]> {
    const path = filter?.subSector
      ? SECTORS_ENDPOINTS.subsectorCompanies(filter.subSector)
      : SECTORS_ENDPOINTS.companies;
    const payload = await this.get(path);
    const rows = Array.isArray(payload)
      ? payload
      : isRecord(payload)
        ? asArray(payload.data ?? payload.results)
        : [];
    const companies = rows.filter(isRecord).map(mapCompany);
    return filter?.exchange
      ? companies.filter((company) => company.exchange === filter.exchange)
      : companies;
  }

  async getCompany(ticker: string): Promise<SectorsCompany> {
    const payload = await this.getRecord(SECTORS_ENDPOINTS.companyReport(ticker));
    const overview = isRecord(payload.overview) ? payload.overview : payload;
    return mapCompany({ symbol: ticker, ...overview });
  }

  async getOwnership(ticker: string): Promise<SectorsOwnership> {
    const payload = await this.getRecord(SECTORS_ENDPOINTS.companyOwnership(ticker));
    const ownership = isRecord(payload.ownership) ? payload.ownership : payload;
    const shareholders = asArray(
      ownership.major_shareholders ?? ownership.shareholders ?? ownership.top_shareholders,
    )
      .filter(isRecord)
      .map(mapShareholder);

    const foreign = shareholders
      .filter((holder) => holder.foreign)
      .reduce((total, holder) => total + holder.sharePercent, 0);

    return {
      ticker: ticker.toUpperCase(),
      shareholders,
      foreignOwnershipPercent: num(ownership, ['foreign_ownership', 'foreign_percentage']) ?? foreign,
      publicFloatPercent:
        num(ownership, ['public_float', 'float_percentage', 'free_float']) ??
        Math.max(0, 100 - shareholders.reduce((t, h) => t + h.sharePercent, 0)),
      parentEntity: str(ownership, ['parent', 'parent_entity', 'controlling_shareholder']),
      ultimateParent: str(ownership, ['ultimate_parent', 'ultimate_beneficial_owner']),
      conglomerateName: str(ownership, ['conglomerate', 'group', 'business_group']),
    };
  }

  async getConglomerate(name: string): Promise<SectorsConglomerate | null> {
    try {
      const payload = await this.getRecord(SECTORS_ENDPOINTS.conglomerates(name));
      const members = asArray(payload.companies ?? payload.members)
        .filter(isRecord)
        .map((raw) => {
          const company = mapCompany(raw);
          return { ticker: company.ticker, name: company.name, marketCap: company.marketCap };
        });
      return { name: str(payload, ['name', 'conglomerate']) ?? name, members };
    } catch (error) {
      if (error instanceof SectorsNotFoundError) return null;
      throw error;
    }
  }

  async getForeignFlows(ticker: string, days: number): Promise<SectorsForeignFlow[]> {
    const payload = await this.get(`${SECTORS_ENDPOINTS.foreignFlows(ticker)}?n_days=${days}`);
    const rows = Array.isArray(payload)
      ? payload
      : isRecord(payload)
        ? asArray(payload.data ?? payload.results)
        : [];
    return rows.filter(isRecord).map((raw) => ({
      date: str(raw, ['date', 'trade_date']) ?? '',
      netFlow: num(raw, ['net_flow', 'foreign_net', 'net_value', 'foreign_net_buy']) ?? 0,
      closePrice: num(raw, ['close', 'close_price', 'price']),
    }));
  }

  async getBrokerActivity(ticker: string, days: number): Promise<SectorsBroker[]> {
    const payload = await this.get(`${SECTORS_ENDPOINTS.brokerActivity(ticker)}?n_days=${days}`);
    const rows = Array.isArray(payload)
      ? payload
      : isRecord(payload)
        ? asArray(payload.data ?? payload.brokers)
        : [];
    return rows.filter(isRecord).map((raw) => ({
      brokerCode: str(raw, ['broker_code', 'code', 'broker']) ?? '??',
      brokerName: str(raw, ['broker_name', 'name']) ?? 'Unknown broker',
      netValue: num(raw, ['net_value', 'net', 'net_buy']) ?? 0,
    }));
  }

  async getCompanyReport(ticker: string): Promise<SectorsCompanyReport> {
    const payload = await this.getRecord(SECTORS_ENDPOINTS.companyReport(ticker));
    const overview = isRecord(payload.overview) ? payload.overview : payload;
    return {
      company: mapCompany({ symbol: ticker, ...overview }),
      financials: mapFinancials(payload),
    };
  }

  async getPeerComparison(ticker: string): Promise<SectorsPeerComparison> {
    const payload = await this.getRecord(SECTORS_ENDPOINTS.peerComparison(ticker));
    const peers = asArray(payload.peers ?? payload.peer_comparison)
      .filter(isRecord)
      .map((raw) => ({ company: mapCompany(raw), financials: mapFinancials(raw) }));
    return { ticker: ticker.toUpperCase(), peers };
  }
}

export function createSectorsDataSource(
  config: AgentsConfig,
  fetchImpl: typeof fetch = fetch,
): SectorsDataSource {
  if (config.useFixtures) {
    return new FixtureSectorsDataSource();
  }
  return new SectorsApiClient(config, fetchImpl);
}
