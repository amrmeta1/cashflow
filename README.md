# CashFlow / TadFuq.ai — Multi-Tenant Financial Platform

Production-grade multi-tenant SaaS backend and Next.js frontend for **TadFuq.ai** (marketing) / **CashFlow.ai** (app), an agentic financial management platform targeting GCC SMEs (Saudi Arabia, Qatar, UAE).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway / LB                          │
│                 (X-Tenant-ID header fallback)                    │
└───────────┬──────────────────────────────┬──────────────────────┘
            │ :8080                         │ :8081
┌───────────▼───────────┐     ┌────────────▼────────────────────┐
│   Tenant Service (Go) │     │  Ingestion Service (Go)         │
│                       │     │                                 │
│  Middleware → Handler  │     │  CSV Import / Bank Sync /       │
│  → UseCase → Repo     │     │  Accounting Sync → RabbitMQ     │
│                       │     │  Command Consumer Worker         │
└───────────┬───────────┘     └──┬──────────────┬───────────────┘
            │                    │              │
  ┌─────────▼─────────┐  ┌──────▼────┐  ┌─────▼──────────────┐
  │  PostgreSQL 16     │  │ Keycloak  │  │  RabbitMQ 3.13     │
  │  (multi-tenant)    │  │ 24 (OIDC) │  │  (events+commands) │
  └────────────────────┘  └───────────┘  └────────────────────┘
```

### Clean Architecture Layers

| Layer | Package | Responsibility |
|-------|---------|----------------|
| **Domain** | `internal/domain` | Entities, repo interfaces, context helpers, errors, role validation |
| **Auth** | `internal/auth` | JWKS client, JWT validator, permission matrix |
| **Events** | `internal/events` | NATS JetStream publisher, consumer worker, envelope schema, OTel propagation |
| **MQ** | `internal/adapter/mq` | RabbitMQ publisher, consumer, topology (exchanges/queues/DLQ), envelope |
| **Use Case** | `internal/usecase` | Business logic, RBAC enforcement, audit logging |
| **Adapter/HTTP** | `internal/adapter/http` | chi router, handlers, response helpers |
| **Adapter/DB** | `internal/adapter/db` | PostgreSQL repository implementations (pgx) |
| **Integrations** | `internal/adapter/integrations` | Bank/Accounting provider interfaces + stubs |
| **Middleware** | `internal/middleware` | Keycloak JWT auth, tenant resolution, user provisioning, RBAC |
| **Config** | `internal/config` | Environment-based configuration (envconfig) |
| **Observability** | `internal/observability` | OpenTelemetry tracer initialization |

### Multi-Tenancy Model

- **Row-level isolation**: Every tenant-scoped entity has a `tenant_id` foreign key
- **Tenant context**: Resolved from JWT custom claim `tenant_id` or `X-Tenant-ID` header
- **Middleware chain**: `KeycloakAuth → TenantFromHeader → ProvisionUser → TenantFromRouteParam → RequireTenantMembership → RequirePermission`
- Every API request within tenant scope is validated for membership and tenant-route consistency
- **Rate limit**: 100 requests/minute per tenant on tenant-scoped routes (in-memory per service instance)

### AuthN/AuthZ

- **Identity Provider**: Keycloak (OIDC) — all authentication handled externally
- **JWT validation**: RS256 signatures verified via JWKS endpoint with key caching
- **User provisioning**: Automatic upsert from JWT claims (sub, email) on first request
- **RBAC roles** (Keycloak client roles): `tenant_admin`, `owner`, `finance_manager`, `accountant_readonly`
- **Permission matrix**: Roles map to fine-grained permissions (`tenant:create`, `member:add`, etc.)
- **Enforcement**: Both middleware-level (`RequirePermission`) and usecase-level checks
- **No local password auth** — users authenticate via Keycloak's token endpoint

### RabbitMQ Event & Command Backbone (Ingestion Service)

- **Broker**: RabbitMQ 3.13 with management plugin
- **Envelope schema**: `event_id`, `event_type`, `tenant_id`, `occurred_at`, `version`, `idempotency_key`, `trace_id`, `payload`
- **At-least-once delivery**: Publisher confirms + manual consumer ACK
- **Idempotency**: `idempotency_keys` table for application-level dedup
- **Retry**: Failed messages dead-letter to retry queues with TTL (5s → 30s → DLQ)

#### Exchanges & Queues

| Exchange | Type | Purpose |
|----------|------|---------|
| `cashflow.events` | topic | Domain events (transactions.ingested, invoices.synced) |
| `cashflow.commands` | direct | Command/job dispatch (ingestion.sync_bank, categorization.run) |
| `cashflow.retry` | direct | Retry routing (retry.5s, retry.30s) |

| Queue | Binds To | Description |
|-------|----------|-------------|
| `q.cashflow.transactions.ingested` | events / `transactions.ingested` | Downstream consumers |
| `q.cashflow.commands.ingestion` | commands / `ingestion.sync_bank`, etc. | Ingestion worker |
| `q.cashflow.retry.5s` | retry / `retry.5s` | 5s delay retry (dead-letters back to commands) |
| `q.cashflow.retry.30s` | retry / `retry.30s` | 30s delay retry |
| `q.cashflow.dlq` | — | Dead-letter queue (terminal failures) |

### NATS JetStream (Tenant Service)

- **Broker**: NATS with JetStream (file-backed, work-queue retention)
- **Used by**: Tenant Service for domain events
- **Streams**: `CASHFLOW`, `CASHFLOW_DLQ`

### Audit & Compliance

Every security-relevant event is captured in `audit_logs` with `actor_sub` (Keycloak subject):
- Tenant creation/update/deletion
- Member added/removed, role changes
- Token validation failures
- Access denied events

## Repository Structure

### Backend (Go)

```
cashflow/
├── cmd/
│   ├── tenant-service/          # Tenant service entrypoint (:8080)
│   ├── ingestion-service/       # Ingestion service entrypoint (:8081)
│   └── worker-example/          # Example NATS consumer worker
├── internal/
│   ├── auth/                    # JWKS client, JWT validator, permissions
│   ├── events/                  # NATS JetStream (tenant-service)
│   ├── domain/                  # Entities, interfaces, errors, context
│   ├── usecase/                 # Business logic (tenant, member, ingestion)
│   ├── adapter/
│   │   ├── http/                # Handlers, routers, response helpers
│   │   ├── db/                  # PostgreSQL repositories
│   │   ├── mq/                  # RabbitMQ publisher, consumer, topology
│   │   └── integrations/        # Bank/Accounting provider interfaces + stubs
│   ├── middleware/               # Keycloak JWT, RBAC, tenant, user provisioning
│   ├── config/                  # Env-based config (tenant + ingestion)
│   └── observability/           # OpenTelemetry setup
├── migrations/                  # golang-migrate SQL files
├── openapi/                     # OpenAPI specs (openapi.yaml, ingestion.yaml)
├── deploy/
│   ├── docker/                  # Dockerfiles + docker-compose
│   ├── keycloak/                # Keycloak realm export JSON
│   └── terraform/               # AWS infrastructure skeleton
├── .github/workflows/           # CI pipeline
├── Makefile                     # Dev commands
└── .env.example                 # Configuration template
```

### Frontend (Next.js)

- **Root:** `/` redirects to `/home`.
- **Landing:** `app/(marketing)/` — layout with `MarketingNavbar` and `LandingFooter`; `home/page.tsx` composes Hero, CustomerLogosBar, StatsSection, PlatformBenefitsSection, DashboardPreviewSection, FinalCtaSection.
- **Marketing components:** `components/marketing/` — `marketing-navbar.tsx`, `hero-section.tsx`, `customer-logos-bar.tsx`, `stats-section.tsx`, `platform-benefits-section.tsx`, `dashboard-preview-section.tsx`, `final-cta-section.tsx`, `landing-footer.tsx` (Kyriba-style TadFuq.ai branding).
- **App:** `app/app/` — dashboard, transactions, import, onboarding, settings, etc. Wrapped in `AppShell` with sidebar and tenant context.
- **Demo:** `app/demo/[slug]/` — client demo route; `DemoContext` and `DemoCompanySync` provide company/industry; sidebar and navbar resolve `/app/*` to `/demo/{slug}/*`.
- **Features:** `features/transactions/` (hooks, mock-api with `addImportedTransactions`, types), `features/import/` (CSV parsing and `useCSVImport`).
- **Config:** `frontend/next.config.js` — optional `webpack.cache = false` in dev to avoid cache snapshot errors. `tailwind.config.ts` — landing colors: `neon`, `gold`, `landing-dark`, `landing-darker`, `landing-cream`, `landing-gray`.

## Quick Start

### Prerequisites

- Go 1.22+
- Docker & Docker Compose
- [golang-migrate](https://github.com/golang-migrate/migrate) CLI

### 1. Start infrastructure

```bash
# Start all infra (postgres, keycloak, nats, rabbitmq)
make up-deps

# Or start everything including both services
make up
```

- **Keycloak admin console**: http://localhost:8180 (`admin` / `admin`)
- **RabbitMQ management UI**: http://localhost:15672 (`guest` / `guest`)

### 2. Run migrations

```bash
make migrate
```

This applies both `000001_init_schema` (tenants/users/memberships/audit) and `000002_ingestion_schema` (bank_accounts/transactions/jobs/idempotency).

### 3. Run locally (without Docker)

```bash
cp .env.example .env

# Terminal 1: tenant-service on :8080
make run

# Terminal 2: ingestion-service on :8081
make run-ingestion
```

### 4. Test Tenant Service API

```bash
# Health check
curl http://localhost:8080/healthz

# Get a Keycloak access token (test user: admin@demo.com / admin123)
TOKEN=$(make keycloak-token)

# Create a tenant
curl -X POST http://localhost:8080/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Finch Capital", "slug": "finch-capital"}'
```

### 5. Test Ingestion Service — CSV Import End-to-End

```bash
TOKEN=$(make keycloak-token)
TENANT_ID="<tenant-id-from-step-4>"

# 1. Register a bank account
curl -X POST "http://localhost:8081/tenants/$TENANT_ID/bank-accounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"nickname": "SNB Main Account", "currency": "SAR", "provider": "manual"}'

# Note the account ID from the response
ACCOUNT_ID="<account-id>"

# 2. Create a sample CSV file
cat > /tmp/transactions.csv << 'EOF'
date,amount,currency,description,counterparty,category
2024-01-15,5000.00,SAR,Invoice payment received,ABC Corp,revenue
2024-01-16,-1200.50,SAR,Office rent,Al Faisaliah Tower,rent
2024-01-17,-350.00,SAR,STC internet bill,STC,utilities
2024-01-18,12500.00,SAR,Client project milestone,XYZ Ltd,revenue
2024-01-19,-800.00,SAR,Employee salary advance,Mohammed Ali,payroll
EOF

# 3. Upload CSV
curl -X POST "http://localhost:8081/tenants/$TENANT_ID/imports/bank-csv" \
  -H "Authorization: Bearer $TOKEN" \
  -F "account_id=$ACCOUNT_ID" \
  -F "file=@/tmp/transactions.csv"

# Response shows: total_rows, inserted, duplicates, errors

# 4. Query transactions
curl "http://localhost:8081/tenants/$TENANT_ID/transactions?from=2024-01-01&to=2024-12-31" \
  -H "Authorization: Bearer $TOKEN"

# 5. Re-upload the same CSV (deduplication test — should show 0 inserted, 5 duplicates)
curl -X POST "http://localhost:8081/tenants/$TENANT_ID/imports/bank-csv" \
  -H "Authorization: Bearer $TOKEN" \
  -F "account_id=$ACCOUNT_ID" \
  -F "file=@/tmp/transactions.csv"
```

### 6. Test Sync Commands & RabbitMQ

```bash
# Enqueue a bank sync command (stub — completes immediately)
curl -X POST "http://localhost:8081/tenants/$TENANT_ID/sync/bank" \
  -H "Authorization: Bearer $TOKEN"

# Enqueue an accounting sync command
curl -X POST "http://localhost:8081/tenants/$TENANT_ID/sync/accounting" \
  -H "Authorization: Bearer $TOKEN"
```

**Viewing messages in RabbitMQ Management UI:**

1. Open http://localhost:15672 (login: `guest` / `guest`)
2. Go to **Queues and Streams** tab
3. You'll see: `q.cashflow.transactions.ingested`, `q.cashflow.commands.ingestion`, retry queues, and DLQ
4. Click on any queue → **Get messages** to inspect message payloads
5. The `Exchanges` tab shows `cashflow.events`, `cashflow.commands`, `cashflow.retry` with their bindings

### Test Users (Keycloak)

| Email | Password | Role |
|-------|----------|------|
| `admin@demo.com` | `admin123` | `tenant_admin` |
| `owner@demo.com` | `owner123` | `owner` |
| `accountant@demo.com` | `accountant123` | `accountant_readonly` |

## Available Make Commands

| Command | Description |
|---------|-------------|
| `make up` | Start all containers (postgres, keycloak, nats, rabbitmq, services) |
| `make down` | Stop and remove containers |
| `make up-deps` | Start infra only (postgres, keycloak, nats, rabbitmq) |
| `make run` | Run tenant-service locally (:8080) |
| `make run-ingestion` | Run ingestion-service locally (:8081) |
| `make run-worker` | Run example NATS consumer worker |
| `make build` | Build tenant-service binary |
| `make build-ingestion` | Build ingestion-service binary |
| `make build-all` | Build all service binaries |
| `make migrate` | Apply DB migrations (golang-migrate) |
| `make migrate-down` | Roll back last migration |
| `make migrate-create NAME=x` | Create new migration |
| `make test` | Run tests |
| `make lint` | Run golangci-lint |
| `make docker-build` | Build tenant-service Docker image |
| `make docker-build-ingestion` | Build ingestion-service Docker image |
| `make docker-build-all` | Build all Docker images |
| `make keycloak-token` | Get test access token |

## API Documentation

### Tenant Service (`:8080`)

Full OpenAPI spec: [`openapi/openapi.yaml`](openapi/openapi.yaml)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/healthz` | No | Health check |
| GET | `/me` | Yes | Current user profile |
| POST | `/tenants` | Yes | Create tenant |
| GET | `/tenants/{id}` | Yes | Get tenant |
| POST | `/tenants/{id}/members` | Yes | Add member |
| GET | `/tenants/{id}/members` | Yes | List members |
| DELETE | `/tenants/{id}/members/{mid}` | Yes | Remove member |
| POST | `/tenants/{id}/roles` | Yes | Change member role |
| GET | `/audit-logs` | Yes | List audit logs |

### Ingestion Service (`:8081`)

Full OpenAPI spec: [`openapi/ingestion.yaml`](openapi/ingestion.yaml)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/healthz` | No | Health check |
| POST | `/tenants/{id}/imports/bank-csv` | Yes | Upload CSV bank transactions |
| GET | `/tenants/{id}/transactions` | Yes | List transactions (with date/account filters) |
| POST | `/tenants/{id}/bank-accounts` | Yes | Register bank account |
| POST | `/tenants/{id}/sync/bank` | Yes | Enqueue bank sync command |
| POST | `/tenants/{id}/sync/accounting` | Yes | Enqueue accounting sync command |

## RBAC Permission Matrix

Roles (12): `tenant_admin`, `owner`, `finance_manager`, `accountant_readonly` (core); `group_cfo`, `treasury_director`, `financial_controller`, `ap_manager`, `ar_manager`, `bank_relationship_manager`, `auditor_readonly`, `board_member` (enterprise).

| Permission | tenant_admin | owner | finance_manager | accountant_readonly | group_cfo | treasury_director | financial_controller | ap_manager | ar_manager | bank_relationship_manager | auditor_readonly | board_member |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `tenant:create` | ✓ | ✓ | | | ✓ | | | | | | | |
| `tenant:read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | ✓ | ✓ | |
| `tenant:update` | ✓ | ✓ | | | ✓ | | | | | | | |
| `tenant:delete` | ✓ | | | | ✓ | | | | | | | |
| `member:add` | ✓ | ✓ | | | ✓ | | | | | | | |
| `member:read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | | ✓ | |
| `member:remove` | ✓ | ✓ | | | ✓ | | | | | | | |
| `member:role_change` | ✓ | ✓ | | | ✓ | | | | | | | |
| `role:create` | ✓ | | | | ✓ | | | | | | | |
| `role:read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | | ✓ | |
| `role:update` | ✓ | | | | ✓ | | | | | | | |
| `audit:read` | ✓ | ✓ | ✓ | | ✓ | | | | | | ✓ | |
| `audit:export` | | | | | ✓ | | | | | | ✓ | |
| `user:read_self` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `ingestion:import` | ✓ | ✓ | ✓ | | ✓ | | | | | | | |
| `ingestion:read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | | ✓ | |
| `ingestion:sync` | ✓ | ✓ | ✓ | | ✓ | | | | | | | |
| `bank_account:create` | ✓ | ✓ | ✓ | | ✓ | | | | | | | |
| `bank_account:read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | ✓ | ✓ | |
| `treasury:read` | | | | | ✓ | ✓ | | | | | | |
| `treasury:write` | | | | | ✓ | ✓ | | | | | | |
| `fx:read` | | | | | ✓ | ✓ | | | | | | |
| `fx:write` | | | | | ✓ | ✓ | | | | | | |
| `forecast:read` | | | | | ✓ | ✓ | | | | | | |
| `forecast:write` | | | | | ✓ | ✓ | | | | | | |
| `payables:read` | | | | | ✓ | | | ✓ | | | | |
| `payables:write` | | | | | ✓ | | | ✓ | | | | |
| `receivables:read` | | | | | ✓ | | | | ✓ | | | |
| `receivables:write` | | | | | ✓ | | | | ✓ | | | |
| `report:executive` | | | | | ✓ | | | | | | | ✓ |

## Ingestion Service — Data Model

### Tables (migration `000002`)

| Table | Description |
|-------|-------------|
| `bank_accounts` | Registered bank accounts per tenant (provider, currency, status) |
| `raw_bank_transactions` | Immutable audit trail of raw imported data (JSONB) |
| `bank_transactions` | Normalized, deduplicated transactions with deterministic hash |
| `ingestion_jobs` | Job tracking for CSV imports and sync operations |
| `idempotency_keys` | At-least-once processing guard for RabbitMQ consumers |

### Deduplication

Each transaction gets a **deterministic SHA-256 hash** computed from: `account_id | date | amount | description | counterparty`. A unique index on `(tenant_id, hash)` prevents duplicate inserts. Re-uploading the same CSV results in 0 new insertions.

## Future Services (Phase 3+)

- **Cashflow Engine** — Real-time cash position calculation
- **Forecast Engine** — AI-powered cash flow prediction
- **Alert Service** — Threshold-based notifications
- **AI Orchestration** — LLM-based financial insights agent

Services communicate via RabbitMQ events and share tenant identity context via Keycloak JWT propagation.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | Go 1.22+ |
| HTTP Router | chi/v5 |
| Database | PostgreSQL 16 |
| DB Driver | pgx/v5 |
| Identity Provider | Keycloak 24 (OIDC / RS256) |
| JWT Validation | JWKS (golang-jwt/v5) |
| Message Queue | RabbitMQ 3.13 (amqp091-go) |
| Event Backbone | NATS JetStream (tenant-service) |
| Migrations | golang-migrate |
| Config | envconfig |
| Logging | zerolog |
| Observability | OpenTelemetry |
| Containerization | Docker |
| CI/CD | GitHub Actions |
| IaC | Terraform (AWS) |

## كيف تشغّل المشروع (Frontend + Backend)

1. **البنية التحتية (مرة واحدة):** من جذر المشروع:
   ```bash
   make up-deps
   make migrate
   ```
2. **الـ Backend (tenant-service):** في طرفية منفصلة:
   ```bash
   DB_PORT=5433 make run
   ```
   (المنفذ 5433 لأن Docker يعرّض Postgres عليه محلياً.)
3. **الواجهة (Frontend):** في طرفية ثالثة:
   ```bash
   cd frontend && npm run dev
   ```
   إذا ظهر `EADDRINUSE` على 3000 فاستخدم: `npx next dev -p 3001` وافتح http://localhost:3001
4. **الدخول:** افتح http://localhost:3000 (أو 3001). مع `NEXT_PUBLIC_DEV_SKIP_AUTH=true` في `frontend/.env` تدخل بدون تسجيل.

---

## تشغيل المشروع خطوة خطوة

من جذر المشروع نفّذ بالترتيب:

| الخطوة | الأمر | ماذا يفعل |
|--------|--------|-----------|
| **1** | `docker compose -f deploy/docker/docker-compose.yml up -d` | يشغّل الحاويات: Postgres (5433)، Keycloak (8180)، NATS، RabbitMQ، tenant-service (8080)، ingestion-service (8081). إذا ظهر خطأ `port 8080` أو `8081 already in use` أوقف أي عملية محلية تستخدمها. |
| **2** | `make migrate` | يطبّق migrations على قاعدة البيانات (مرة واحدة بعد أول `up`). |
| **3** | `DB_PORT=5433 make run` | يشغّل **tenant-service** محلياً على :8080 (يحتاج المنفذ 8080 حراً). |
| **4** | `DB_PORT=5433 make run-ingestion` | يشغّل **ingestion-service** محلياً على :8081 (في طرفية ثانية؛ يحتاج 8081 حراً). |
| **5** | `cd frontend && npm run dev` | يشغّل الواجهة على :3000 (في طرفية ثالثة). |

**بديل: تشغيل كل شيء من Docker (بدون تشغيل الخدمات محلياً)**  
استخدم الخطوة 1 فقط — الـ compose يشغّل tenant و ingestion داخل Docker. لا تحتاج الخطوتين 3 و 4.

**بديل: تشغيل البنية التحتية فقط ثم الخدمات محلياً**  
لتجنب تعارض المنافذ 8080 و 8081:
```bash
docker compose -f deploy/docker/docker-compose.yml up -d postgres keycloak nats rabbitmq
make migrate
# ثم في طرفيتين منفصلتين:
DB_PORT=5433 make run
DB_PORT=5433 make run-ingestion
```
ثم في طرفية ثالثة: `cd frontend && npm run dev`.

---

## Recent Updates (Frontend & Landing)

### Landing Page (TadFuq.ai)

- **Kyriba-inspired redesign** at `/home`: sticky dark navbar (#111), hero with neon-green CTAs and dashboard preview, customer logos bar, stats section (cream background), platform benefits (4 glowing cards), interactive dashboard preview, final CTA, and heavy dark footer.
- **Brand:** TadFuq.ai with **neon green** `#00FFAA` and **gold** `#FFD700`; dark theme `#0A2540` / `#111111`, light sections `#F8F7F4`. Full Arabic RTL and Cairo font.
- **Navbar:** Solutions | Platform | Liquidity Performance | Agents | Resources | Pricing | About; language switcher (EN | عربي); Login; **Request Demo** (neon button).
- **Content:** Agentic AI (Raqib, Mutawaqi, Mustashar), Project Cash Flow, Group Consolidation, GCC compliance & ZATCA VAT.

### Client Demo Mode

- **URL:** `/demo/[slug]` (e.g. `/demo/harbi-contracting`) for a shareable, no-login demo.
- **DemoContext** drives company name and industry from the URL; **DemoCompanySync** sets mock options so alerts, daily brief, and reports show personalized copy.
- **Sidebar & navbar:** In demo mode, all `/app/*` links resolve to `/demo/{slug}/*` so navigation stays inside the demo. Logo and “Transactions” link are demo-aware.
- **Banner:** “DEMO — {Company} — هذه بيانات تجريبية” and CTA **ابدأ الربط الحقيقي الآن** linking to onboarding with pre-filled company/industry.

### Onboarding

- **Pre-fill from demo:** `?from=demo&company=...&industry=...` pre-fills company name and industry.
- **Authenticated users:** On completion, **createTenant** is called; workspace is linked to the account. If the backend is unavailable, settings are saved locally with a message to sync later.
- **Next steps:** Link to `/app/integrations-hub` (connect bank or import data). Redirect to dashboard uses `router.replace`.

### CSV Import & Transactions

- **Real CSV parsing** in the browser: `parseCSVToImportRows()` supports date, amount, credit/debit, description columns (EN/AR headers). Rows are shown in the review step; count and copy reflect actual file data.
- **On confirm:** `addImportedTransactions(tenantId, rows)` persists to `localStorage` and merges into `fetchTransactions` by tenant. React Query cache is invalidated so the Transactions page and dashboard show new data immediately.
- **Dashboard “Recent transactions”:** Uses `useTransactions(currentTenant?.id)`; shows last 5–7 transactions (including imported) with loading skeleton and relative time. “Transactions →” link uses demo path when in demo mode.

### Daily Brief & Mock Data

- **Daily Brief page** uses `getMockDailyBrief()` for the greeting (company name in demo) and a bullet list of items (balance, expected flows, actions).
- **Mock data** (alerts, reports, daily brief) uses `getDemoMockOptions()` when in client demo for personalized company name.

### Frontend Config & Tooling

- **next.config.js:** In development, `webpack.cache = false` to avoid “Unable to snapshot resolve dependencies” (PackFileCacheStrategy). Clear `.next` and `node_modules/.cache` if cache issues persist.
- **Tailwind:** Landing colors added: `neon`, `gold`, `landing-dark`, `landing-darker`, `landing-cream`, `landing-gray`.

---

## Frontend — تشغيل واستكشاف الأخطاء

- **تشغيل الواجهة:** من مجلد المشروع: `cd frontend && npm run dev` ثم افتح **نفس الرابط** الذي يظهر في الطرفية (مثلاً `http://localhost:3000`). إذا كان المنفذ 3000 مستخدماً ستظهر رسالة خطأ — أوقف العملية التي تستخدمه أو شغّل على منفذ آخر: `npx next dev -p 3001`.
- **الصفحة الرئيسية:** الرابط `/` يحوّل تلقائياً إلى `/home`. صفحة الهبوط الجديدة (TadFuq.ai) تعرض الهيرو، إحصائيات، مميزات المنصة، ومعاينة لوحة التحكم.
- **وضع الديمو:** افتح `/demo/harbi-contracting` أو `/demo/company-name` لتجربة التطبيق بدون تسجيل مع بيانات تجريبية مخصصة للشركة.
- **لوحة التحكم `/app/dashboard`:** تحتاج تسجيل الدخول (أو استخدم الديمو). إذا كان `NEXT_PUBLIC_DEV_SKIP_AUTH=true` في `frontend/.env` يمكن الدخول بدون تسجيل. أول دخول قد يحوّلك إلى `/app/onboarding` — أكمل الإعداد لرؤية الـ dashboard. قسم «المعاملات الأخيرة» يعرض معاملات حقيقية من الاستيراد + البيانات التجريبية.
- **استيراد CSV:** من `/app/import` يمكنك رفع ملف CSV بنكي؛ يتم تحليله في المتصفح وعند التأكيد تُضاف المعاملات إلى صفحة المعاملات ولوحة التحكم.
- **اسأل مستشار (Command Palette):** من أي صفحة داخل التطبيق يمكنك الضغط **Cmd+K** (أو Ctrl+K) أو النقر على زر **اسأل مستشار** الأخضر أسفل يمين الشاشة لفتح قائمة الأوامر: تنقل سريع، إجراءات (استيراد، تقارير، تصدير PDF)، وأوامر الذكاء الاصطناعي (رقيب، متوقع، مستشار). اختيار أمر AI يفتح محادثة مستشار مع السؤال مملوء مسبقاً.
- إذا استمرت المشكلة: افتح أدوات المطوّر (F12) → تبويب Console وانسخ أي رسالة خطأ باللون الأحمر.

### Keycloak لا ينقل بعد Sign in

- **NEXTAUTH_URL:** في `frontend/.env` يجب أن يساوي **نفس الرابط** الذي تفتح فيه الموقع في المتصفح. إذا فتحت `http://127.0.0.1:3000` فضع `NEXTAUTH_URL=http://127.0.0.1:3000`؛ إذا `http://localhost:3000` فضع `NEXTAUTH_URL=http://localhost:3000`.
- **NEXTAUTH_SECRET:** يجب أن يكون معرّفاً (سطر غير فارغ)، وإلا قد يفشل التوجيه بعد تسجيل الدخول.
- **Redirect URIs في Keycloak:** الـ realm المستورد يتضمّن `http://localhost:3000/api/auth/callback/keycloak` ونسخة `127.0.0.1`. إذا كان Keycloak قديم أو تم تعديله يدوياً: من لوحة Keycloak (http://localhost:8180) → Realm **cashflow** → Clients → **cashflow-api** → تبويب **Settings** → تأكد أن **Valid redirect URIs** تحتوي على:
  - `http://localhost:3000/*` أو على الأقل `http://localhost:3000/api/auth/callback/keycloak`
  - وإذا كنت تستخدم 127.0.0.1: `http://127.0.0.1:3000/*` أو `http://127.0.0.1:3000/api/auth/callback/keycloak`
- **Web origins:** في نفس الصفحة تأكد أن **Web origins** تحتوي على `http://localhost:3000` أو `http://127.0.0.1:3000` حسب ما تستخدمه.
- بعد أي تعديل على الـ realm: أعد تشغيل Keycloak أو أعد استيراد الـ realm من `deploy/keycloak/realm-export.json`.

## Testing RBAC — تجربة الصلاحيات

### 1. تجربة من الواجهة (Frontend)

**أ) بدون تسجيل دخول (أدوار ثابتة):**

- في `frontend/.env` ضع `NEXT_PUBLIC_DEV_SKIP_AUTH=true`.
- شغّل الواجهة: `cd frontend && npm run dev`.
- ادخل على `/app/dashboard` — ستُعامل كـ `tenant_admin` + `owner` (ترى كل القوائم والإعدادات).

**ب) مع Keycloak (أدوار حقيقية):**

1. شغّل البنية التحتية: `make up-deps` (يشغّل Postgres + Keycloak + NATS + RabbitMQ).
2. انتظر Keycloak حتى يجهز الـ realm (من الـ import)، ثم شغّل الـ tenant-service: `make run` (أو عبر Docker).
3. في `frontend/.env`: **أزل أو عطّل** `NEXT_PUBLIC_DEV_SKIP_AUTH` (أو ضعها `false`)، وضبط:
   - `KEYCLOAK_ISSUER=http://localhost:8180/realms/cashflow`
   - `KEYCLOAK_CLIENT_ID=cashflow-api`
   - `KEYCLOAK_CLIENT_SECRET=cashflow-api-secret`
   - `NEXTAUTH_URL=http://localhost:3000`
4. شغّل الواجهة: `cd frontend && npm run dev`.
5. ادخل على `/login` وسجّل الدخول بمستخدم Keycloak. **أنشئ في Keycloak مستخدمين واعطِ كل واحد دوراً مختلفاً** (من الـ client `cashflow-api`): مثلاً `tenant_admin`, `owner`, `finance_manager`, `accountant_readonly`, أو أحد الأدوار الجديدة مثل `board_member`, `ap_manager`.
6. بعد تسجيل الدخول:
   - **الإعدادات** (`/app/settings`) و **سجل التدقيق** (`/app/audit`) يظهران فقط لـ `tenant_admin` و `owner` (إن رُفضت يُحوّلك للـ dashboard).
   - صفحة **الأدوار** (`/app/settings/roles`) تعرض الصلاحيات المحلولة لكل دور حسب مصفوفة الـ RBAC.

إذا لم يكن عندك مستخدمين في Keycloak، أنشئهم من لوحة Keycloak: http://localhost:8180 (admin / admin) → Realm `cashflow` → Users → Add user، ثم في تبويب Role mapping اختر Client roles `cashflow-api` وأضف الدور المطلوب.

### 2. تجربة من الـ API (Backend)

1. شغّل البنية التحتية والـ tenant-service: `make up-deps` ثم `make run`.
2. احصل على توكن:
   ```bash
   TOKEN=$(make keycloak-token)
   ```
   (هذا يستخدم المستخدم الافتراضي `admin@demo.com` إن وُجد في الـ realm.)
3. استدعِ مسارات محمية بصلاحيات:
   ```bash
   # قراءة الملف الشخصي (أي مستخدم مصادق)
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/me | jq

   # إنشاء tenant (يحتاج tenant:create — مثلاً tenant_admin أو owner)
   curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"name":"Test Org","slug":"test-org"}' http://localhost:8080/tenants | jq

   # سجل التدقيق (يحتاج audit:read + X-Tenant-ID)
   curl -s -H "Authorization: Bearer $TOKEN" -H "X-Tenant-ID: <tenant-uuid>" \
     http://localhost:8080/audit-logs | jq
   ```
4. لمقارنة الأدوار: أنشئ في Keycloak مستخدمين بدوار مختلفة، احصل لكل واحد على توكن (بـ username/password عبر `/protocol/openid-connect/token`) ثم أعد الاستدعاءات أعلاه — المسارات المحمية بصلاحية سترجع `403 Forbidden` إن لم يكن للدور الصلاحية المطلوبة.

### 3. أمثلة cURL: توكن + معاملات (Ingestion)

- **توكن:** يُستخرج من **Keycloak** على المنفذ **8180** (وليس 8080). استخدم `make keycloak-token` أو:

  ```bash
  TOKEN=$(curl -s -X POST "http://localhost:8180/realms/cashflow/protocol/openid-connect/token" \
    -d "client_id=cashflow-api" \
    -d "client_secret=cashflow-api-secret" \
    -d "username=admin@demo.com" \
    -d "password=admin123" \
    -d "grant_type=password" | jq -r '.access_token')
  ```

- **قائمة المعاملات (Ingestion على 8081):** تحتاج `tenant_id` (UUID). مستخدمو الـ realm الافتراضي لهم `tenant_id` في الـ claim = `00000000-0000-0000-0000-000000000001`؛ أو أنشئ tenant من الـ tenant-service ثم استخدم الـ ID المُرجَع.

  ```bash
  TENANT_ID="00000000-0000-0000-0000-000000000001"

  curl -s -H "Authorization: Bearer $TOKEN" \
    "http://localhost:8081/tenants/${TENANT_ID}/transactions?limit=20" | jq '.data[] | {date, description, amount}'
  ```

  (الاستجابة من الـ API بصيغة `{ "data": [ ... ], "meta": { ... } }` لذلك استخدم `.data[]` في jq.)

- **استيراد CSV بنكي (Ingestion على 8081):** تحتاج `tenant_id` و `account_id` (UUID لحساب بنكي). أنشئ حساباً من `POST /tenants/{tenantId}/bank-accounts` إن لم يكن لديك، ثم:

  ```bash
  TENANT_ID="00000000-0000-0000-0000-000000000001"
  ACCOUNT_ID="<uuid-from-bank-accounts>"

  curl -X POST "http://localhost:8081/tenants/${TENANT_ID}/imports/bank-csv" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/path/to/your.csv" \
    -F "account_id=${ACCOUNT_ID}"
  ```
