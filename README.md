# CashFlow.ai — Tenant & Identity Foundation

Production-grade multi-tenant SaaS backend for **CashFlow.ai**, an agentic financial management platform targeting GCC SMEs (Saudi Arabia, Qatar, UAE).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway / LB                        │
│                  (X-Tenant-ID header routing)                │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Tenant Service (Go)                        │
│                                                              │
│  ┌─────────┐  ┌────────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Middleware│→│ HTTP Handler│→│  UseCase  │→│ Repository │  │
│  │ (JWT,RBAC│  │ (chi router)│  │  (domain  │  │ (pgx/pool)│  │
│  │ tenant)  │  │             │  │   logic)  │  │           │  │
│  └─────────┘  └────────────┘  └──────────┘  └───────────┘  │
│                                                              │
│  Observability: OpenTelemetry traces + zerolog structured    │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │    PostgreSQL 16         │
              │  (multi-tenant schema)   │
              └─────────────────────────┘
```

### Clean Architecture Layers

| Layer | Package | Responsibility |
|-------|---------|----------------|
| **Domain** | `internal/domain` | Entities, value objects, repository interfaces, context helpers, errors |
| **Use Case** | `internal/usecase` | Business logic orchestration, audit logging |
| **Adapter/HTTP** | `internal/adapter/http` | chi router, handlers, request/response mapping |
| **Adapter/DB** | `internal/adapter/db` | PostgreSQL repository implementations (pgx) |
| **Middleware** | `internal/middleware` | JWT auth, tenant resolution, RBAC enforcement, request logging |
| **Config** | `internal/config` | Environment-based configuration (envconfig) |
| **Observability** | `internal/observability` | OpenTelemetry tracer initialization |

### Multi-Tenancy Model

- **Row-level isolation**: Every tenant-scoped entity has a `tenant_id` foreign key
- **Tenant context**: Resolved from JWT claims (`tenant_id`) or `X-Tenant-ID` header
- **Middleware chain**: `JWTAuth → TenantFromHeader → RequireTenant → RequirePermission`
- Every API request within tenant scope is validated for membership

### AuthN/AuthZ

- **Primary**: OIDC via Keycloak (JWT validation, `idp_subject`/`idp_issuer` on users)
- **Fallback**: Local email+password auth with bcrypt + HS256 JWT (for dev/bootstrapping)
- **RBAC**: Roles are per-tenant, linked to fine-grained permissions (`resource:action`)
- **Enforcement**: Middleware-level (`RequirePermission`) and service-level checks

### Audit & Compliance

Every security-relevant event is captured in `audit_logs`:
- Login attempts (success + failure)
- Tenant creation/update/deletion
- User management actions
- Role changes and permission updates
- Token validation failures

## Repository Structure

```
cashflow/
├── cmd/tenant-service/      # Service entrypoint
├── internal/
│   ├── domain/              # Entities, interfaces, errors, context
│   ├── usecase/             # Business logic (tenant, auth, user)
│   ├── adapter/
│   │   ├── http/            # Handlers, router, response helpers
│   │   └── db/              # PostgreSQL repositories
│   ├── middleware/           # JWT, RBAC, tenant, logging
│   ├── config/              # Env-based config
│   └── observability/       # OpenTelemetry setup
├── migrations/              # PostgreSQL DDL
├── openapi/                 # OpenAPI 3.1 spec
├── deploy/
│   ├── docker/              # Dockerfile + docker-compose
│   └── terraform/           # AWS infrastructure skeleton
├── .github/workflows/       # CI pipeline
├── Makefile                 # Dev commands
└── .env.example             # Configuration template
```

## Quick Start

### Prerequisites

- Go 1.22+
- Docker & Docker Compose
- PostgreSQL client (`psql`) for migrations

### 1. Start infrastructure

```bash
# Start postgres + keycloak
make up-deps

# Or start everything including the service
make up
```

### 2. Run migrations

```bash
make migrate
```

### 3. Run locally (without Docker)

```bash
cp .env.example .env
# Edit .env if needed

make run
```

### 4. Test the API

```bash
# Health check
curl http://localhost:8080/healthz

# Register a user
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@finch.co",
    "password": "secureP@ss1",
    "full_name": "Admin User"
  }'

# Create a tenant (requires auth token)
curl -X POST http://localhost:8080/api/v1/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "name": "Finch Capital",
    "slug": "finch-capital"
  }'

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@finch.co",
    "password": "secureP@ss1"
  }'
```

## Available Make Commands

| Command | Description |
|---------|-------------|
| `make up` | Start all containers |
| `make down` | Stop and remove containers |
| `make up-deps` | Start only postgres + keycloak |
| `make run` | Run service locally |
| `make migrate` | Apply DB migrations |
| `make migrate-down` | Rollback migrations |
| `make test` | Run tests |
| `make lint` | Run golangci-lint |
| `make build` | Build binary |
| `make docker-build` | Build Docker image |

## API Documentation

Full OpenAPI 3.1 spec: [`openapi/openapi.yaml`](openapi/openapi.yaml)

### Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/healthz` | No | Health check |
| POST | `/api/v1/auth/register` | No | Register user |
| POST | `/api/v1/auth/login` | No | Login |
| GET | `/api/v1/me` | Yes | Current user profile |
| POST | `/api/v1/tenants` | Yes | Create tenant |
| GET | `/api/v1/tenants` | Yes | List tenants |
| GET | `/api/v1/tenants/:id` | Yes | Get tenant |
| PUT | `/api/v1/tenants/:id` | Yes | Update tenant |
| DELETE | `/api/v1/tenants/:id` | Yes | Delete tenant |
| GET | `/api/v1/users` | Yes | List users (tenant) |
| GET | `/api/v1/users/:id` | Yes | Get user |
| PUT | `/api/v1/users/:id` | Yes | Update user |
| DELETE | `/api/v1/users/:id` | Yes | Delete user |
| POST | `/api/v1/roles` | Yes | Create role |
| GET | `/api/v1/roles` | Yes | List roles (tenant) |
| GET | `/api/v1/roles/:id` | Yes | Get role |
| PUT | `/api/v1/roles/:id` | Yes | Update role |
| DELETE | `/api/v1/roles/:id` | Yes | Delete role |
| GET | `/api/v1/permissions` | Yes | List permissions |
| POST | `/api/v1/memberships` | Yes | Add member |
| PUT | `/api/v1/memberships/:id/role` | Yes | Change role |
| DELETE | `/api/v1/memberships/:id` | Yes | Remove member |
| GET | `/api/v1/audit-logs` | Yes | List audit logs |

## Future Services (Phase 2+)

This foundation is designed to support additional microservices:

- **Ingestion Service** — Bank statement parsing (OFX, CSV, PDF)
- **Cashflow Engine** — Real-time cash position calculation
- **Forecast Engine** — AI-powered cash flow prediction
- **Alert Service** — Threshold-based notifications
- **AI Orchestration** — LLM-based financial insights agent

Each service will share the tenant identity context via JWT propagation.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | Go 1.22 |
| HTTP Router | chi/v5 |
| Database | PostgreSQL 16 |
| DB Driver | pgx/v5 |
| Auth | JWT (golang-jwt/v5) + Keycloak OIDC |
| Config | envconfig |
| Logging | zerolog |
| Observability | OpenTelemetry |
| Containerization | Docker |
| CI/CD | GitHub Actions |
| IaC | Terraform (AWS) |
