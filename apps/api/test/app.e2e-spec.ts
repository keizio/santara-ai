import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { AnalysisResult, QueryPlan } from '@santara/shared';
import { AppModule } from './../src/app.module';

/** Requires Postgres (`pnpm db:up`); run with `pnpm --filter api test:e2e`. */
describe('Santara API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('reports health', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({
      status: 'ok',
      usesFixtures: true,
    });
  });

  it('plans a natural language query', async () => {
    const response = await request(app.getHttpServer())
      .post('/queries/plan')
      .send({
        query:
          'IDX stocks where foreign investors buy heavily this week but P/E under 10',
      })
      .expect(201);

    const plan = response.body as QueryPlan;
    expect(plan.intent).toBe('screen');
    expect(plan.filter.maxPe).toBe(10);
  });

  it('analyses a ticker and persists the run', async () => {
    const created = await request(app.getHttpServer())
      .post('/analyses')
      .send({ ticker: 'BBCA' })
      .expect(201);

    const analysis = created.body as AnalysisResult;
    expect(analysis.company.ticker).toBe('BBCA');
    expect(analysis.verdict?.executiveSummary).toContain('BBCA');

    await request(app.getHttpServer())
      .get(`/analyses/${analysis.id}`)
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
