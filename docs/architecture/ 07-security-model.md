# Security Model

## Authentication
JWT-based authentication (Keycloak OIDC)

## Authorization
Role-based access control (RBAC) + tenant membership enforcement on tenant-scoped routes

## Data Protection
- Tenant isolation
- Strict DB scoping
- No shared tables without tenant_id
- Route tenant validation (`/tenants/{tenantID}` must match tenant context)

## Rate Limiting
100 requests per minute per tenant (in-memory limiter per service instance)

## Audit Logs
All critical actions logged:
- Scenario creation
- Alert resolution
- CSV import
- Auth token validation failures
