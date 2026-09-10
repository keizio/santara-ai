import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

loadEnv({ path: join(__dirname, '..', '..', '..', '..', '.env') });
loadEnv();

/** Used by the TypeORM CLI only; the app builds its DataSource through Nest. */
export default new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ??
    'postgres://santara:santara@localhost:5432/santara',
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
