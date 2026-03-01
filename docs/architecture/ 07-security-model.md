# Security Model

## Authentication
JWT-based authentication

## Authorization
Role-based access control (RBAC)

## Data Protection
- Tenant isolation
- Strict DB scoping
- No shared tables without tenant_id

## Rate Limiting
100 requests per minute per tenant

## Audit Logs
All critical actions logged:
- Scenario creation
- Alert resolution
- CSV import