export interface AgentsConfig {
  sectorsApiKey: string;
  sectorsBaseUrl: string;
  useFixtures: boolean;
  openAiApiKey: string;
  openAiModel: string;
  deterministicFallback: boolean;
}

const bool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export function loadAgentsConfig(env: NodeJS.ProcessEnv = process.env): AgentsConfig {
  const sectorsApiKey = env.SECTORS_API_KEY ?? '';
  const openAiApiKey = env.OPENAI_API_KEY ?? '';

  return {
    sectorsApiKey,
    sectorsBaseUrl: env.SECTORS_API_BASE_URL ?? 'https://api.sectors.app/v1',
    useFixtures: bool(env.SECTORS_USE_FIXTURES, true) || sectorsApiKey === '',
    openAiApiKey,
    openAiModel: env.OPENAI_MODEL ?? 'gpt-4o-mini',
    deterministicFallback: bool(env.AGENTS_DETERMINISTIC_FALLBACK, true) || openAiApiKey === '',
  };
}

export const isLlmEnabled = (config: AgentsConfig): boolean => config.openAiApiKey !== '';
