export type OwnershipNodeKind =
  | 'target'
  | 'parent'
  | 'ultimate-parent'
  | 'sister'
  | 'shareholder';

export interface OwnershipNode {
  id: string;
  label: string;
  kind: OwnershipNodeKind;
  ticker?: string;
  /** Percentage of the child entity held by this node, 0-100. */
  sharePercent?: number;
  foreign?: boolean;
}

export interface OwnershipEdge {
  source: string;
  target: string;
  /** Percentage stake represented by the edge, 0-100. */
  sharePercent: number;
}

export interface OwnershipGraph {
  nodes: OwnershipNode[];
  edges: OwnershipEdge[];
}

export interface ConglomerateProfile {
  name: string;
  /** Tickers of listed companies belonging to the same group. */
  listedMembers: string[];
  totalMarketCap: number | null;
}

export interface OwnershipReport {
  ticker: string;
  ultimateParent: string | null;
  conglomerate: ConglomerateProfile | null;
  /** Combined stake held by the top shareholders, 0-100. */
  topHolderConcentration: number;
  foreignOwnershipPercent: number;
  domesticOwnershipPercent: number;
  publicFloatPercent: number;
  sisterCompanies: string[];
  graph: OwnershipGraph;
  risks: string[];
  narrative: string;
}
