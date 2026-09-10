import type { OwnershipEdge, OwnershipGraph, OwnershipNode, OwnershipReport } from '@santara/shared';
import type { SectorsCompany, SectorsConglomerate, SectorsOwnership } from '../sectors/types';

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/**
 * Turns flat shareholder rows into the parent/sister graph the conglomerate
 * visualiser renders, and derives the concentration risks the judge scores.
 */
export function buildOwnershipReport(input: {
  company: SectorsCompany;
  ownership: SectorsOwnership;
  conglomerate: SectorsConglomerate | null;
}): OwnershipReport {
  const { company, ownership, conglomerate } = input;

  const nodes: OwnershipNode[] = [];
  const edges: OwnershipEdge[] = [];

  const targetId = `company:${company.ticker}`;
  nodes.push({
    id: targetId,
    label: `${company.ticker} — ${company.name}`,
    kind: 'target',
    ticker: company.ticker,
  });

  for (const holder of ownership.shareholders) {
    const id = `holder:${slug(holder.name)}`;
    const isParent = holder.name === ownership.parentEntity;
    nodes.push({
      id,
      label: holder.name,
      kind: isParent ? 'parent' : 'shareholder',
      sharePercent: holder.sharePercent,
      foreign: holder.foreign,
    });
    edges.push({ source: id, target: targetId, sharePercent: holder.sharePercent });
  }

  if (ownership.ultimateParent) {
    const ultimateId = `ultimate:${slug(ownership.ultimateParent)}`;
    nodes.push({ id: ultimateId, label: ownership.ultimateParent, kind: 'ultimate-parent' });
    const parentNode = nodes.find((node) => node.kind === 'parent');
    edges.push({
      source: ultimateId,
      target: parentNode?.id ?? targetId,
      sharePercent: parentNode?.sharePercent ?? 100,
    });
  }

  const sisterCompanies = (conglomerate?.members ?? [])
    .map((member) => member.ticker)
    .filter((ticker) => ticker !== company.ticker);

  const anchorId = ownership.ultimateParent
    ? `ultimate:${slug(ownership.ultimateParent)}`
    : targetId;

  for (const member of conglomerate?.members ?? []) {
    if (member.ticker === company.ticker) continue;
    const id = `sister:${member.ticker}`;
    nodes.push({
      id,
      label: `${member.ticker} — ${member.name}`,
      kind: 'sister',
      ticker: member.ticker,
    });
    edges.push({ source: anchorId, target: id, sharePercent: 0 });
  }

  const sortedHolders = [...ownership.shareholders].sort(
    (a, b) => b.sharePercent - a.sharePercent,
  );
  const topHolderConcentration = sortedHolders
    .filter((holder) => holder.entityType !== 'public')
    .slice(0, 3)
    .reduce((total, holder) => total + holder.sharePercent, 0);

  const risks: string[] = [];
  if (topHolderConcentration >= 60) {
    risks.push(
      `Top holders control ${topHolderConcentration.toFixed(1)}% of the register — minority holders have limited influence`,
    );
  }
  if (ownership.publicFloatPercent <= 12) {
    risks.push(
      `Free float of only ${ownership.publicFloatPercent.toFixed(1)}% makes the price sensitive to a single broker's order flow`,
    );
  }
  if (sisterCompanies.length >= 3) {
    risks.push(
      `${conglomerate?.name} exposure spans ${sisterCompanies.length + 1} listed tickers — group-level shocks propagate across holdings`,
    );
  }
  if (ownership.foreignOwnershipPercent >= 30) {
    risks.push(
      `Foreign holders own ${ownership.foreignOwnershipPercent.toFixed(1)}% — the stock is exposed to EM outflow cycles`,
    );
  }

  const graph: OwnershipGraph = { nodes, edges };

  const narrative = [
    `${company.ticker} is controlled by ${ownership.parentEntity ?? 'a dispersed shareholder base'}`,
    ownership.ultimateParent
      ? `with ultimate beneficial ownership resting at ${ownership.ultimateParent}`
      : 'with no single ultimate beneficial owner disclosed',
    conglomerate
      ? `inside ${conglomerate.name} (${conglomerate.members.length} listed entities)`
      : 'outside any mapped conglomerate structure',
    `Foreign investors hold ${ownership.foreignOwnershipPercent.toFixed(1)}% against a ${ownership.publicFloatPercent.toFixed(1)}% public float.`,
  ].join(', ');

  return {
    ticker: company.ticker,
    ultimateParent: ownership.ultimateParent,
    conglomerate: conglomerate
      ? {
          name: conglomerate.name,
          listedMembers: conglomerate.members.map((member) => member.ticker),
          totalMarketCap: conglomerate.members.reduce(
            (total, member) => total + (member.marketCap ?? 0),
            0,
          ),
        }
      : null,
    topHolderConcentration: Number(topHolderConcentration.toFixed(2)),
    foreignOwnershipPercent: ownership.foreignOwnershipPercent,
    domesticOwnershipPercent: Number(
      Math.max(0, 100 - ownership.foreignOwnershipPercent).toFixed(2),
    ),
    publicFloatPercent: ownership.publicFloatPercent,
    sisterCompanies,
    graph,
    risks,
    narrative,
  };
}
