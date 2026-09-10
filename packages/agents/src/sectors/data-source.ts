import type { ScreenerFilter } from '@santara/shared';
import type {
  SectorsBroker,
  SectorsCompany,
  SectorsCompanyReport,
  SectorsConglomerate,
  SectorsForeignFlow,
  SectorsOwnership,
  SectorsPeerComparison,
} from './types';

export interface SectorsDataSource {
  readonly usesFixtures: boolean;
  listCompanies(filter?: ScreenerFilter): Promise<SectorsCompany[]>;
  getCompany(ticker: string): Promise<SectorsCompany>;
  getOwnership(ticker: string): Promise<SectorsOwnership>;
  getConglomerate(name: string): Promise<SectorsConglomerate | null>;
  getForeignFlows(ticker: string, days: number): Promise<SectorsForeignFlow[]>;
  getBrokerActivity(ticker: string, days: number): Promise<SectorsBroker[]>;
  getCompanyReport(ticker: string): Promise<SectorsCompanyReport>;
  getPeerComparison(ticker: string): Promise<SectorsPeerComparison>;
}

export class SectorsNotFoundError extends Error {
  constructor(public readonly ticker: string) {
    super(`Ticker "${ticker}" was not found on IDX or SGX coverage`);
    this.name = 'SectorsNotFoundError';
  }
}
