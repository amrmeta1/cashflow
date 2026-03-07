# CashFlow.ai Frontend

Production-grade Next.js dashboard for CashFlow.ai — agentic financial management for GCC SMEs.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Data Fetching**: TanStack Query (React Query)
- **Auth**: Removed (previously used NextAuth.js)
- **Charts**: Recharts
- **Validation**: Zod
- **i18n**: Arabic + English with full RTL support

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and configure
cp .env.example .env.local

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8080` |
| `NODE_ENV` | Environment | `development` |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1` |

> **⚠️ Note**: Authentication has been removed. All environment variables related to NextAuth and Keycloak are no longer needed.

### Optional Variables

| Email | Password | Role |
|---|---|---|
| `admin@demo.com` | `admin123` | `tenant_admin` |
| `owner@demo.com` | `owner123` | `owner` |
| `accountant@demo.com` | `accountant123` | `accountant_readonly` |

## Running with Backend

```bash
# From the repo root, start all services:
cd deploy/docker
docker-compose up -d

# Then start the frontend:
cd frontend
npm run dev
```

Services:
- **Tenant API**: http://localhost:8080
- **Ingestion API**: http://localhost:8081
- **Frontend**: http://localhost:3000

## Project Structure

```
frontend/
├── app/
│   ├── (marketing)/            # Public marketing pages
│   │   ├── home/               # Landing page
│   │   ├── pricing/            # Pricing plans
│   │   ├── security/           # Security overview
│   │   ├── partners/           # Partner program
│   │   └── demo/               # Demo request form
│   ├── api/
│   │   ├── health/             # Health check endpoint
│   │   └── leads/              # Demo lead capture API
│   └── app/                    # App routes (no auth required)
│       ├── dashboard/          # Cash dashboard with charts
│       ├── forecast/           # 13-week/30-day forecast + scenarios
│       ├── alerts/             # Alert inbox + detail view
│       ├── agents/             # AI agent cards + daily brief
│       ├── transactions/       # Transaction table + filters
│       ├── import/             # CSV upload page
│       ├── reports/            # Monthly reports + preview
│       ├── onboarding/         # Guided setup wizard
│       ├── billing/            # Plan, usage, invoices
│       ├── settings/           # Org, Members, Roles, Integrations, Security
│       └── audit/              # Audit log (admin only)
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   └── layout/                 # App shell, sidebar, navbar
├── lib/
│   ├── api/                    # Typed API client + endpoint functions
│   ├── auth/                   # Auth options + RBAC permissions
│   ├── config/                 # Pricing plans config
│   ├── hooks/                  # Tenant context, permissions hook
│   └── i18n/                   # EN/AR dictionaries + context
└── .env.example
```

## Features

### Core Platform
- **No Authentication**: All features accessible without login
- **Multi-tenancy**: X-Tenant-ID header on API calls
- **i18n**: Arabic/English toggle with full RTL layout support, GCC currency formatting (SAR/AED/QAR)
- **Observability**: `x-request-id` header on every API call for trace correlation
- **Mock Data**: Dev-mode mock data behind `NEXT_PUBLIC_ENABLE_MOCKS` flag

### MVP Pages
- **Onboarding Wizard**: 5-step guided setup (country, currency, bank account, CSV import, confirmation)
- **Forecast**: 13-week/30-day area charts, base/optimistic/pessimistic scenarios, editable assumptions
- **Alerts**: Inbox with severity/status filters, detail view with acknowledge/resolve/snooze actions
- **AI Agents**: Agent status cards (Raqib, Mutawaqi, Mustashar) + daily morning brief
- **Reports**: Monthly report list, generate, preview with chart + narrative, PDF export placeholder
- **CSV Import**: Upload page wired to `POST /tenants/{id}/imports/bank-csv`, shows dedup results
- **Transactions**: Table with date/amount/account filters, CSV export
- **Audit Log**: Admin-only security event viewer

### SaaS Pages
- **Billing**: Current plan card, usage meters (accounts/users/integrations), invoice history
- **Integrations**: CSV (active), bank providers (Lean, Tarabut — coming soon), accounting (Zoho, Wafeq, QuickBooks — coming soon)
- **Security**: Active sessions, allowed domains placeholder, 2FA placeholder, audit log link

### Public Marketing
- **Landing Page** (`/home`): Hero, features grid, social proof, CTA
- **Pricing** (`/pricing`): 4-tier plan cards with feature lists
- **Security** (`/security`): Enterprise security feature cards
- **Partners** (`/partners/accounting-firms`): Partner program benefits
- **Demo** (`/demo`): Lead capture form → `/api/leads`

### UX Polish
- **404 page**: Custom not-found with navigation links
- **Error boundaries**: Root + app-level error pages with retry
- **Loading states**: Skeleton loader for app routes

## Scripts

```bash
npm run dev     # Start development server
npm run build   # Production build
npm run start   # Start production server
npm run lint    # Run ESLint
```
