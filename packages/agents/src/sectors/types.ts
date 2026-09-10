import type { Exchange } from '@santara/shared';

/**
 * Normalised shapes the rest of the codebase works with. The Sectors payloads
 * are mapped onto these by `mapRaw*` in `client.ts`, so an upstream field
 * rename only has to be handled in one place.
 */

export interface SectorsCompany {
  ticker: string;
  name: string;
  exchange: Exchange;
  sector: string;
  subSector: string;
  marketCap: number | null;
}

export interface SectorsShareholder {
  name: string;
  sharePercent: number;
  foreign: boolean;
  entityType: 'individual' | 'institution' | 'government' | 'public';
}

export interface SectorsOwnership {
  ticker: string;
  shareholders: SectorsShareholder[];
  foreignOwnershipPercent: number;
  publicFloatPercent: number;
  parentEntity: string | null;
  ultimateParent: string | null;
  conglomerateName: string | null;
}

export interface SectorsConglomerate {
  name: string;
  members: { ticker: string; name: string; marketCap: number | null }[];
}

export interface SectorsForeignFlow {
  date: string;
  netFlow: number;
  closePrice: number | null;
}

export interface SectorsBroker {
  brokerCode: string;
  brokerName: string;
  netValue: number;
}

export interface SectorsFinancials {
  pe: number | null;
  pb: number | null;
  evToEbitda: number | null;
  dividendYield: number | null;
  roe: number | null;
  debtToEquity: number | null;
  earningsGrowthYoy: number | null;
  revenueGrowthYoy: number | null;
}

export interface SectorsCompanyReport {
  company: SectorsCompany;
  financials: SectorsFinancials;
}

export interface SectorsPeerComparison {
  ticker: string;
  peers: SectorsCompanyReport[];
}
