-- Rollback: Financial Ingestion Service Schema

DROP TABLE IF EXISTS idempotency_keys;
DROP TABLE IF EXISTS ingestion_jobs;
DROP TABLE IF EXISTS bank_transactions;
DROP TABLE IF EXISTS raw_bank_transactions;
DROP TABLE IF EXISTS bank_accounts;
