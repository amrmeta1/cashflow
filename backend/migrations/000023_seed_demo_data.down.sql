-- Remove demo bank accounts
DELETE FROM bank_accounts 
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND nickname IN ('QNB - Operating Account', 'Doha Bank - Main Account');

-- Remove demo tenant (will cascade delete all related data)
DELETE FROM tenants 
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
