import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1789060000000 implements MigrationInterface {
  name = 'InitialSchema1789060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "companies" (
        "ticker" character varying(12) NOT NULL,
        "name" character varying(160) NOT NULL,
        "exchange" character varying(8) NOT NULL,
        "sub_sector" character varying(80) NOT NULL,
        "conglomerate" character varying(120),
        "market_cap" numeric(24,2),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_companies" PRIMARY KEY ("ticker")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "analysis_runs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ticker" character varying(12) NOT NULL,
        "query" text,
        "recommendation" character varying(24) NOT NULL,
        "score" integer NOT NULL,
        "confidence" numeric(4,3) NOT NULL,
        "used_fixtures" boolean NOT NULL DEFAULT false,
        "company" jsonb NOT NULL,
        "ownership" jsonb,
        "flows" jsonb,
        "fundamentals" jsonb,
        "verdict" jsonb NOT NULL,
        "traces" jsonb NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_analysis_runs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_analysis_runs_ticker_created_at" ON "analysis_runs" ("ticker", "created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "alert_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "analysis_run_id" uuid,
        "channel" character varying(24) NOT NULL,
        "status" character varying(16) NOT NULL,
        "message" text NOT NULL,
        "error" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alert_logs" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "alert_logs"`);
    await queryRunner.query(`DROP INDEX "IDX_analysis_runs_ticker_created_at"`);
    await queryRunner.query(`DROP TABLE "analysis_runs"`);
    await queryRunner.query(`DROP TABLE "companies"`);
  }
}
