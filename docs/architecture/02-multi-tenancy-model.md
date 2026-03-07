# Multi-Tenancy Model

Tadfuq.ai uses strict tenant-based isolation.

## Isolation Strategy

- Each request carries tenant_id
- All DB queries are scoped by tenant_id
- Alerts, forecasts, transactions are tenant-scoped
- No cross-tenant joins allowed
- Tenant route IDs are validated against request tenant context
- Tenant-scoped APIs require active membership for authenticated user

## Access Control

RBAC Model:
- tenant_admin
- owner
- finance_manager
- accountant_readonly

Permission example:
PermTreasuryRead
PermTreasuryWrite
