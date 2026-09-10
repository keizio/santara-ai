import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { FlowReport, FundamentalsReport, OwnershipReport, ScreenerHit } from '@santara/shared';
import type { SectorsDataSource } from '../sectors/data-source';
import { SECTORS_ENDPOINTS } from '../sectors/endpoints';
import { buildOwnershipReport } from '../analysis/ownership';
import { buildFlowReport } from '../analysis/flows';
import { buildFundamentalsReport } from '../analysis/fundamentals';

const tickerSchema = z
  .string()
  .min(1)
  .max(12)
  .transform((value) => value.toUpperCase());

/**
 * The data-gathering half of every agent. Each tool returns a fully derived
 * report so the LLM never has to do arithmetic on raw rows — it only reasons
 * about the outcome.
 */
export async function buildOwnership(
  dataSource: SectorsDataSource,
  ticker: string,
): Promise<OwnershipReport> {
  const [company, ownership] = await Promise.all([
    dataSource.getCompany(ticker),
    dataSource.getOwnership(ticker),
  ]);
  const conglomerate = ownership.conglomerateName
    ? await dataSource.getConglomerate(ownership.conglomerateName)
    : null;
  return buildOwnershipReport({ company, ownership, conglomerate });
}

export async function buildFlows(
  dataSource: SectorsDataSource,
  ticker: string,
  windowDays: number,
): Promise<FlowReport> {
  const [flows, brokers] = await Promise.all([
    dataSource.getForeignFlows(ticker, windowDays),
    dataSource.getBrokerActivity(ticker, windowDays),
  ]);
  return buildFlowReport({ ticker: ticker.toUpperCase(), windowDays, flows, brokers });
}

export async function buildFundamentals(
  dataSource: SectorsDataSource,
  ticker: string,
): Promise<FundamentalsReport> {
  const [target, peerComparison] = await Promise.all([
    dataSource.getCompanyReport(ticker),
    dataSource.getPeerComparison(ticker),
  ]);
  return buildFundamentalsReport({ target, peers: peerComparison.peers });
}

export async function runScreener(
  dataSource: SectorsDataSource,
  filter: {
    exchange?: 'IDX' | 'SGX';
    subSector?: string;
    maxPe?: number;
    minForeignNetBuy?: number;
    lookbackDays?: number;
    limit?: number;
  },
): Promise<ScreenerHit[]> {
  const lookbackDays = filter.lookbackDays ?? 5;
  const companies = await dataSource.listCompanies(filter);

  const hits = await Promise.all(
    companies.map(async (company) => {
      const [report, flows] = await Promise.all([
        dataSource.getCompanyReport(company.ticker),
        dataSource.getForeignFlows(company.ticker, lookbackDays),
      ]);
      const foreignNetFlow = flows.reduce((total, point) => total + point.netFlow, 0);
      return {
        ticker: company.ticker,
        name: company.name,
        exchange: company.exchange,
        sector: company.sector,
        subSector: company.subSector,
        pe: report.financials.pe,
        pb: report.financials.pb,
        marketCap: company.marketCap,
        foreignNetFlow,
      } satisfies ScreenerHit;
    }),
  );

  return hits
    .filter((hit) => (filter.maxPe === undefined ? true : hit.pe !== null && hit.pe <= filter.maxPe))
    .filter((hit) =>
      filter.minForeignNetBuy === undefined
        ? true
        : hit.foreignNetFlow >= filter.minForeignNetBuy,
    )
    .sort((a, b) => b.foreignNetFlow - a.foreignNetFlow)
    .slice(0, filter.limit ?? 10);
}

export function createSantaraTools(dataSource: SectorsDataSource) {
  const ownershipTool = createTool({
    id: 'sectors-company-ownership',
    description:
      'Map the shareholder register, parent entities, ultimate beneficial owner and listed sister companies of an IDX/SGX ticker.',
    inputSchema: z.object({ ticker: tickerSchema }),
    execute: async ({ ticker }) => buildOwnership(dataSource, ticker),
  });

  const flowTool = createTool({
    id: 'sectors-foreign-flows',
    description:
      'Fetch foreign net flows and broker accumulation/distribution for a ticker over a lookback window.',
    inputSchema: z.object({
      ticker: tickerSchema,
      windowDays: z.number().int().min(3).max(90).default(20),
    }),
    execute: async ({ ticker, windowDays }) => buildFlows(dataSource, ticker, windowDays),
  });

  const fundamentalsTool = createTool({
    id: 'sectors-company-report',
    description:
      'Fetch valuation ratios (P/E, P/B, EV/EBITDA), growth and the sub-sector peer comparison for a ticker.',
    inputSchema: z.object({ ticker: tickerSchema }),
    execute: async ({ ticker }) => buildFundamentals(dataSource, ticker),
  });

  const screenerTool = createTool({
    id: 'sectors-screener',
    description:
      'Screen IDX/SGX companies by exchange, sub-sector, maximum P/E and minimum foreign net buying over a lookback window.',
    inputSchema: z.object({
      exchange: z.enum(['IDX', 'SGX']).optional(),
      subSector: z.string().optional(),
      maxPe: z.number().positive().optional(),
      minForeignNetBuy: z.number().optional(),
      lookbackDays: z.number().int().min(1).max(90).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    execute: async (input) => runScreener(dataSource, input),
  });

  return { ownershipTool, flowTool, fundamentalsTool, screenerTool };
}

export const AGENT_ENDPOINTS = {
  ownership: [SECTORS_ENDPOINTS.companyOwnership(':ticker'), SECTORS_ENDPOINTS.conglomerates(':group')],
  flow: [SECTORS_ENDPOINTS.foreignFlows(':ticker'), SECTORS_ENDPOINTS.brokerActivity(':ticker')],
  fundamentals: [
    SECTORS_ENDPOINTS.companyReport(':ticker'),
    SECTORS_ENDPOINTS.peerComparison(':ticker'),
  ],
  judge: [],
} as const;
