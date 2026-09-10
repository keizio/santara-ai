import { Mastra } from '@mastra/core/mastra';
import { loadAgentsConfig } from './config';
import { createSantaraDataSource } from './sectors';
import { createSantaraAgents } from './agents';

const config = loadAgentsConfig();
const agents = createSantaraAgents(config, createSantaraDataSource(config));

/**
 * Registry consumed by the Mastra playground/CLI. The NestJS backend uses
 * `SantaraEngine` directly rather than this instance.
 */
export const mastra = new Mastra({
  agents: {
    queryPlanner: agents.planner,
    ownershipAgent: agents.ownership,
    flowAgent: agents.flow,
    fundamentalsAgent: agents.fundamentals,
    judgeAgent: agents.judge,
  },
});
