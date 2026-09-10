# Santara AI

Automated conglomerate & foreign flow intelligence engine for Southeast Asian equities (IDX & SGX).
A multi-agent pipeline maps ownership trees, tracks foreign capital flows and broker activity,
benchmarks valuation against peers, and reconciles everything into a scored verdict with a
one-page executive summary.

## Stack

| Layer     | Tech                                               |
| --------- | -------------------------------------------------- |
| Frontend  | Next.js 16 (App Router) + Tailwind CSS v4           |
| Backend   | NestJS 11 + TypeORM + PostgreSQL                    |
| Agents    | Mastra + AI SDK (OpenAI), deterministic fallback    |
| Data      | Sectors.app API, with bundled fixtures for offline  |
| Alerts    | Telegram bot (optional)                             |

```
apps/
  web/        Next.js dashboard
  api/        NestJS API, entities, migrations, alerts
packages/
  shared/     Domain types + deterministic scoring rules
  agents/     Sectors client, Mastra agents, orchestration pipeline
```

## Agents

| Agent                              | Responsibility                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| Orchestrator / Query Planner       | Turns a natural language question into a structured plan (tickers, filters)     |
| Ownership & Conglomerate Agent     | Ultimate parents, sister listings, foreign/domestic stakes, concentration risk  |
| Flow & Sentiment Agent             | Foreign net flows, broker accumulation/distribution, abnormality detection      |
| Fundamentals & Peer Comparison     | P/E, P/B, EV/EBITDA, ROE, growth vs sector peers                                |
| Judge / Reconciler Agent           | Deterministic scoring, anomaly flags, recommendation, executive summary         |

Scoring is always deterministic (`packages/shared/src/scoring.ts`); the LLM only rewrites the
narrative. Without `OPENAI_API_KEY` the agents run fully rule-based, and without
`SECTORS_API_KEY` the bundled IDX/SGX fixtures are used — so the app runs end to end with no keys.

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm db:up            # Postgres 16 via docker compose
pnpm build            # shared -> agents -> api -> web
pnpm dev              # web on :3000, api on :3001 (migrations run on boot)
```

## Environment

See `.env.example`. Key variables:

- `DATABASE_URL` — Postgres connection string
- `SECTORS_API_KEY` / `SECTORS_USE_FIXTURES` — live data vs bundled fixtures
- `OPENAI_API_KEY` / `AGENTS_DETERMINISTIC_FALLBACK` — LLM narrative vs rule-based
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` / `TELEGRAM_ALERTS_ENABLED` — alerts
- `NEXT_PUBLIC_API_URL` — API base URL used by the dashboard

## API

| Method | Route            | Purpose                                              |
| ------ | ---------------- | ---------------------------------------------------- |
| GET    | `/health`        | Liveness + whether fixtures are in use                |
| GET    | `/companies`     | Cached company universe                               |
| POST   | `/queries/plan`  | Natural language → structured query plan              |
| POST   | `/screener`      | Screen the universe by plan or explicit filters       |
| POST   | `/analyses`      | Run the full agent pipeline for a ticker/query        |
| GET    | `/analyses`      | Recent runs                                           |
| GET    | `/analyses/:id`  | A single persisted run                                |

```bash
curl -s localhost:3001/screener -H 'content-type: application/json' \
  -d '{"query":"Show me IDX stocks where foreign investors are buying heavily this week but P/E is under 10"}'
```

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter api test:e2e   # needs Postgres running
```
