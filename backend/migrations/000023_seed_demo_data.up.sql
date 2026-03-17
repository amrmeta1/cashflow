-- Seed demo tenant and bank accounts for testing/demo purposes
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING)

-- 1. Ensure demo tenant exists
INSERT INTO tenants (id, name, slug, plan, status, metadata)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Demo Company',
    'demo',
    'enterprise',
    'active',
    '{"demo": true, "created_by": "seed_migration"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 2. Seed bank accounts for demo tenant
INSERT INTO bank_accounts (tenant_id, provider, currency, nickname, status, metadata)
VALUES 
    (
        '00000000-0000-0000-0000-000000000001'::uuid,
        'manual',
        'QAR',
        'QNB - Operating Account',
        'active',
        '{"bank_name": "QNB", "account_name": "Operating Account"}'::jsonb
    ),
    (
        '00000000-0000-0000-0000-000000000001'::uuid,
        'manual',
        'QAR',
        'Doha Bank - Main Account',
        'active',
        '{"bank_name": "Doha Bank", "account_name": "Main Account"}'::jsonb
    )
ON CONFLICT DO NOTHING;

-- Add helpful comment
COMMENT ON TABLE bank_accounts IS 'Bank accounts for transaction tracking. Demo accounts seeded via migration 000023.';
