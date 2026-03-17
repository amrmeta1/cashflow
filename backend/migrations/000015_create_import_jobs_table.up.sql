-- Create import_jobs table to track file imports
CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- pdf, csv, excel
    bank_type TEXT NOT NULL, -- qnb, hsbc, csv, etc.
    transaction_count INTEGER NOT NULL DEFAULT 0,
    total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'QAR',
    status TEXT NOT NULL DEFAULT 'success', -- success, failed, partial
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_import_jobs_tenant_id ON import_jobs(tenant_id);
CREATE INDEX idx_import_jobs_created_at ON import_jobs(created_at DESC);
