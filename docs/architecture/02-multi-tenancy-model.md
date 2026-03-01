# Multi-Tenancy Model

Tadfuq.ai uses strict tenant-based isolation.

## Isolation Strategy

- Each request carries tenant_id
- All DB queries are scoped by tenant_id
- Alerts, forecasts, transactions are tenant-scoped
- No cross-tenant joins allowed

## Access Control

RBAC Model:
- Admin
- Finance Manager
- Analyst
- Viewer

Permission example:
PermTreasuryRead
PermTreasuryWrite