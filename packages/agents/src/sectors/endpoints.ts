/**
 * Endpoint paths for the Sectors.app REST API. They are grouped by the agent
 * that owns them so a trace can report exactly which endpoints produced a
 * report.
 */
export const SECTORS_ENDPOINTS = {
  companies: '/companies/',
  companyReport: (ticker: string) => `/company/report/${ticker}/`,
  companyOwnership: (ticker: string) => `/company/report/${ticker}/?sections=ownership`,
  conglomerates: (group: string) => `/conglomerates/${encodeURIComponent(group)}/`,
  foreignFlows: (ticker: string) => `/foreign-flows/${ticker}/`,
  brokerActivity: (ticker: string) => `/broker-activity/${ticker}/`,
  peerComparison: (ticker: string) => `/company/report/${ticker}/?sections=peers,valuation`,
  subsectorCompanies: (subSector: string) =>
    `/companies/?sub_sector=${encodeURIComponent(subSector)}`,
} as const;

export type SectorsEndpointName = keyof typeof SECTORS_ENDPOINTS;
