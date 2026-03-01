# Supabase Multi-Tenant Schema

Production-ready multi-tenant schema and RLS for Tadfuq.ai.

## Apply migrations

1. **Supabase project**: Create a project at [supabase.com](https://supabase.com) and get your project URL and anon key.
2. **Run migrations** in order in the SQL Editor (Dashboard → SQL Editor):
   - `migrations/00001_tenants_and_multitenant_schema.sql`
   - `migrations/00002_rls_policies.sql`

Or with Supabase CLI from repo root:

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

## JWT requirement for RLS

Row Level Security uses `tenant_id` from the JWT. Ensure your auth (e.g. Keycloak or Supabase Auth) sets one of:

- Custom claim: `tenant_id` (UUID string)
- Or `app_metadata.tenant_id`

So that `public.current_tenant_id()` returns the correct tenant. The Next.js app sends `X-Tenant-ID` to the backend; when using Supabase client from the app, set the JWT with this claim (e.g. via custom Supabase auth or by passing a signed JWT that includes `tenant_id`).

## Scalability

Schema is designed so you can later move to **schema-per-tenant** (e.g. `tenant_123.transactions`) if needed; all tenant-scoped tables already have `tenant_id` and RLS.
