import type { ScreenerFilter } from '@santara/shared';
import { SectorsNotFoundError, type SectorsDataSource } from '../data-source';
import type {
  SectorsBroker,
  SectorsCompany,
  SectorsCompanyReport,
  SectorsConglomerate,
  SectorsForeignFlow,
  SectorsOwnership,
  SectorsPeerComparison,
} from '../types';
import { FIXTURE_BROKERS, FIXTURE_COMPANIES, type FixtureCompany } from './companies';

/** Mulberry32 — small deterministic PRNG so fixture series never change between runs. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tradingDays(days: number, reference: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(reference);
  while (dates.length < days) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return dates.reverse();
}

function lookup(ticker: string): FixtureCompany {
  const entry = FIXTURE_COMPANIES[ticker.toUpperCase()];
  if (!entry) throw new SectorsNotFoundError(ticker);
  return entry;
}

/**
 * Offline data source backed by hand-curated IDX/SGX fixtures. It powers demos
 * and tests without a Sectors.app key while keeping the exact same contract as
 * the HTTP client.
 */
export class FixtureSectorsDataSource implements SectorsDataSource {
  readonly usesFixtures = true;

  constructor(private readonly referenceDate: Date = new Date('2026-09-04T00:00:00Z')) {}

  async listCompanies(filter?: ScreenerFilter): Promise<SectorsCompany[]> {
    let companies = Object.values(FIXTURE_COMPANIES);
    if (filter?.exchange) {
      companies = companies.filter((c) => c.company.exchange === filter.exchange);
    }
    if (filter?.subSector) {
      const needle = filter.subSector.toLowerCase();
      companies = companies.filter((c) => c.company.subSector.toLowerCase().includes(needle));
    }
    return companies.map((c) => c.company);
  }

  async getCompany(ticker: string): Promise<SectorsCompany> {
    return lookup(ticker).company;
  }

  async getOwnership(ticker: string): Promise<SectorsOwnership> {
    return lookup(ticker).ownership;
  }

  async getConglomerate(name: string): Promise<SectorsConglomerate | null> {
    const members = Object.values(FIXTURE_COMPANIES).filter(
      (c) => c.ownership.conglomerateName?.toLowerCase() === name.toLowerCase(),
    );
    if (members.length === 0) return null;
    return {
      name: members[0].ownership.conglomerateName ?? name,
      members: members.map((m) => ({
        ticker: m.company.ticker,
        name: m.company.name,
        marketCap: m.company.marketCap,
      })),
    };
  }

  async getForeignFlows(ticker: string, days: number): Promise<SectorsForeignFlow[]> {
    const entry = lookup(ticker);
    const random = seededRandom(entry.flowSeed);
    const dates = tradingDays(days, this.referenceDate);
    const amplitude = Math.max(Math.abs(entry.flowBias) * 2.5, 1);
    let price = entry.company.exchange === 'IDX' ? 4500 : 32;

    return dates.map((date, index) => {
      const noise = (random() - 0.5) * amplitude;
      // The last three sessions carry a stronger bias so the abnormality
      // detector has something meaningful to find in demos.
      const recencyBoost = index >= dates.length - 3 ? 1.8 : 1;
      const netFlow = Math.round(entry.flowBias * recencyBoost + noise);
      price = Number((price * (1 + netFlow / (amplitude * 400))).toFixed(2));
      return { date, netFlow, closePrice: price };
    });
  }

  async getBrokerActivity(ticker: string, days: number): Promise<SectorsBroker[]> {
    const entry = lookup(ticker);
    const random = seededRandom(entry.flowSeed + days);
    return FIXTURE_BROKERS.map((broker, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      const magnitude = Math.abs(entry.flowBias) * (0.4 + random());
      return {
        brokerCode: broker.code,
        brokerName: broker.name,
        netValue: Math.round(direction * magnitude * (entry.flowBias >= 0 ? 1 : -1)),
      };
    });
  }

  async getCompanyReport(ticker: string): Promise<SectorsCompanyReport> {
    const entry = lookup(ticker);
    return { company: entry.company, financials: entry.financials };
  }

  async getPeerComparison(ticker: string): Promise<SectorsPeerComparison> {
    const entry = lookup(ticker);
    const peers = Object.values(FIXTURE_COMPANIES)
      .filter(
        (c) =>
          c.company.ticker !== entry.company.ticker &&
          c.company.subSector === entry.company.subSector,
      )
      .map((c) => ({ company: c.company, financials: c.financials }));

    // Fall back to sector peers when the sub-sector has no other member.
    if (peers.length === 0) {
      return {
        ticker: entry.company.ticker,
        peers: Object.values(FIXTURE_COMPANIES)
          .filter(
            (c) =>
              c.company.ticker !== entry.company.ticker &&
              c.company.sector === entry.company.sector,
          )
          .map((c) => ({ company: c.company, financials: c.financials })),
      };
    }

    return { ticker: entry.company.ticker, peers };
  }
}

export { FIXTURE_COMPANIES };
