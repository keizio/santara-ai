export type Exchange = 'IDX' | 'SGX';

export interface CompanyRef {
  ticker: string;
  name: string;
  exchange: Exchange;
  sector?: string;
  subSector?: string;
  marketCap?: number | null;
  conglomerate?: string | null;
}

export interface ScreenerFilter {
  exchange?: Exchange;
  subSector?: string;
  maxPe?: number;
  minPe?: number;
  maxPb?: number;
  minMarketCap?: number;
  minForeignNetBuy?: number;
  lookbackDays?: number;
  limit?: number;
}

export interface ScreenerHit extends CompanyRef {
  pe: number | null;
  pb: number | null;
  marketCap: number | null;
  foreignNetFlow: number;
}
