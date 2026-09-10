export interface AppConfig {
  port: number;
  corsOrigin: string;
  databaseUrl: string;
  dbSynchronize: boolean;
  dbLogging: boolean;
  telegram: {
    enabled: boolean;
    botToken: string;
    chatId: string;
  };
}

const asBool = (value: string | undefined, fallback = false): boolean =>
  value === undefined || value === ''
    ? fallback
    : value.toLowerCase() === 'true';

export const configuration = (): AppConfig => ({
  port: Number(process.env.API_PORT ?? 3001),
  corsOrigin: process.env.API_CORS_ORIGIN ?? 'http://localhost:3000',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://santara:santara@localhost:5432/santara',
  dbSynchronize: asBool(process.env.DB_SYNCHRONIZE),
  dbLogging: asBool(process.env.DB_LOGGING),
  telegram: {
    enabled: asBool(process.env.TELEGRAM_ALERTS_ENABLED),
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    chatId: process.env.TELEGRAM_CHAT_ID ?? '',
  },
});
