import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import type { AgentsConfig } from '../config';
import { createSantaraTools } from '../tools';
import type { SectorsDataSource } from '../sectors/data-source';

const HOUSE_STYLE = `You write for buy-side analysts covering Indonesian (IDX) and Singaporean (SGX) equities.
Be specific and quantitative, never generic. Use the numbers you are given verbatim.
Never invent figures that are not present in the tool output. Keep prose tight — no filler,
no hedging boilerplate, no bullet padding.`;

export interface SantaraAgents {
  planner: Agent;
  ownership: Agent;
  flow: Agent;
  fundamentals: Agent;
  judge: Agent;
}

export function createSantaraAgents(
  config: AgentsConfig,
  dataSource: SectorsDataSource,
): SantaraAgents {
  const tools = createSantaraTools(dataSource);
  const model = openai(config.openAiModel);

  const planner = new Agent({
    id: 'query-planner',
    name: 'Orchestrator / Query Planner',
    description:
      'Turns a natural language research question into a structured plan of tickers, filters and agents.',
    instructions: `${HOUSE_STYLE}

You convert an analyst's question into a structured query plan. Decide whether the question targets specific
tickers ("single-company") or asks to screen the market ("screen"). Extract IDX (4-letter) and SGX (letter+digits)
tickers, valuation bounds, foreign-flow conditions and the lookback window implied by phrases like "this week"
(5 sessions) or "this month" (20 sessions). Only include agents that the question actually needs.`,
    model,
    tools: { screenerTool: tools.screenerTool },
  });

  const ownership = new Agent({
    id: 'ownership-agent',
    name: 'Ownership & Conglomerate Agent',
    description:
      'Maps corporate relationships, ultimate parents and cross-holdings across Southeast Asian conglomerates.',
    instructions: `${HOUSE_STYLE}

You map ownership structures. Given a pre-computed ownership report, explain who ultimately controls the
company, which listed sister companies sit in the same group, and what concentration risk that creates for
minority holders. Call out thin free floats and heavy foreign ownership as explicit risks.`,
    model,
    tools: { ownershipTool: tools.ownershipTool },
  });

  const flow = new Agent({
    id: 'flow-agent',
    name: 'Flow & Sentiment Agent',
    description: 'Tracks foreign capital flows and broker accumulation patterns.',
    instructions: `${HOUSE_STYLE}

You interpret institutional money movement. Given a foreign-flow report, state whether foreign investors are
accumulating or distributing, how abnormal the latest sessions are versus the window mean, and which brokers
are on each side. Say plainly when the signal is too weak to act on.`,
    model,
    tools: { flowTool: tools.flowTool },
  });

  const fundamentals = new Agent({
    id: 'fundamentals-agent',
    name: 'Fundamentals & Peer Comparison Agent',
    description: 'Analyses valuation ratios and relative positioning against sub-sector peers.',
    instructions: `${HOUSE_STYLE}

You assess financial health and relative valuation. Given a fundamentals report, compare the target's P/E,
P/B and EV/EBITDA against the peer median, and reconcile the valuation with growth and returns. A cheap
multiple on deteriorating earnings is a value trap, not a discount — say so.`,
    model,
    tools: { fundamentalsTool: tools.fundamentalsTool, screenerTool: tools.screenerTool },
  });

  const judge = new Agent({
    id: 'judge-agent',
    name: 'Judge / Reconciler Agent',
    description: 'Synthesises the specialist agents into one scored recommendation.',
    instructions: `${HOUSE_STYLE}

You reconcile the ownership, flow and fundamentals reports into a single executive summary.
The numeric score and recommendation are computed by the house scoring rule and given to you — never
override them, explain them. Lead with the divergences: earnings growing into foreign outflows, foreign
accumulation into a thin float, or a peer discount that ownership concentration justifies.
Write at most six sentences.`,
    model,
    tools: {},
  });

  return { planner, ownership, flow, fundamentals, judge };
}
