import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'node:path';
import { AlertsModule } from './alerts/alerts.module';
import { AnalysisModule } from './analysis/analysis.module';
import { EngineModule } from './engine/engine.module';
import { configuration, type AppConfig } from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      envFilePath: ['.env', join(__dirname, '..', '..', '..', '.env')],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        type: 'postgres' as const,
        url: config.get('databaseUrl', { infer: true }),
        synchronize: config.get('dbSynchronize', { infer: true }),
        logging: config.get('dbLogging', { infer: true }),
        autoLoadEntities: true,
        migrations: [join(__dirname, 'database', 'migrations', '*.{ts,js}')],
        migrationsRun: true,
      }),
    }),
    EngineModule,
    AlertsModule,
    AnalysisModule,
  ],
})
export class AppModule {}
