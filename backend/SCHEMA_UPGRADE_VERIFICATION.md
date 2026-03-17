# Database Schema Upgrade Verification Guide

This document provides SQL queries and steps to verify the database schema upgrade was successful.

## Migration Files Created

✅ **000006_enable_pgvector** - Enable pgvector extension
✅ **000007_add_embedding_vector_column** - Add pgvector column to document_chunks
✅ **000008_create_financial_metrics** - Create financial_metrics table
✅ **000009_enhance_cash_analyses** - Add metadata columns to cash_analyses
✅ **000010_enhance_rag_queries** - Add observability columns to rag_queries
✅ **000011_verify_documents_type** - Verify documents.type flexibility

---

## Pre-Migration Checks

### 1. Check Current Database Version
```sql
SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;
```
Expected: Should show `000005` before migration

### 2. Backup Database (RECOMMENDED)
```bash
pg_dump -h localhost -U postgres -d financial_rag > backup_before_upgrade_$(date +%Y%m%d_%H%M%S).sql
```

---

## Running Migrations

### Option 1: Using golang-migrate
```bash
cd /Users/adam/Desktop/tad/tadfuq-platform/backend
./migrations/run-migrations.sh
```

### Option 2: Manual Migration
```bash
cd /Users/adam/Desktop/tad/tadfuq-platform/backend/migrations

# Run each migration in order
psql -h localhost -U postgres -d financial_rag -f 000006_enable_pgvector.up.sql
psql -h localhost -U postgres -d financial_rag -f 000007_add_embedding_vector_column.up.sql
psql -h localhost -U postgres -d financial_rag -f 000008_create_financial_metrics.up.sql
psql -h localhost -U postgres -d financial_rag -f 000009_enhance_cash_analyses.up.sql
psql -h localhost -U postgres -d financial_rag -f 000010_enhance_rag_queries.up.sql
psql -h localhost -U postgres -d financial_rag -f 000011_verify_documents_type.up.sql
```

---

## Post-Migration Verification

### 1. Check pgvector Extension
```sql
-- Verify extension is installed
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'vector';
```
**Expected Output:**
```
 extname | extversion 
---------+------------
 vector  | 0.5.1
```

### 2. Verify document_chunks Schema
```sql
-- Check both embedding columns exist
SELECT 
    column_name, 
    data_type, 
    udt_name,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'document_chunks' 
AND column_name IN ('embedding', 'embedding_vector')
ORDER BY column_name;
```
**Expected Output:**
```
   column_name    | data_type | udt_name | character_maximum_length | is_nullable 
------------------+-----------+----------+--------------------------+-------------
 embedding        | text      | text     |                          | YES
 embedding_vector | USER-DEFINED | vector |                       | YES
```

### 3. Check document_chunks Indexes
```sql
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'document_chunks' 
AND indexname LIKE '%embedding%';
```
**Expected Output:**
```
              indexname               |                           indexdef
--------------------------------------+---------------------------------------------------------------
 idx_document_chunks_embedding_vector | CREATE INDEX idx_document_chunks_embedding_vector ON ...
```

### 4. Verify financial_metrics Table
```sql
-- Check table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'financial_metrics';

-- Check columns
\d financial_metrics
```
**Expected Columns:**
- id (UUID)
- tenant_id (UUID)
- metric_name (TEXT)
- metric_value (NUMERIC)
- period_start (DATE)
- period_end (DATE)
- created_at (TIMESTAMPTZ)
- metadata (JSONB)

### 5. Check financial_metrics Indexes
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'financial_metrics'
ORDER BY indexname;
```
**Expected Indexes:**
- idx_financial_metrics_created
- idx_financial_metrics_name
- idx_financial_metrics_period
- idx_financial_metrics_tenant
- idx_financial_metrics_tenant_name

### 6. Verify cash_analyses Enhancements
```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'cash_analyses' 
AND column_name IN ('source_reference', 'analysis_version')
ORDER BY column_name;
```
**Expected Output:**
```
   column_name    | data_type | is_nullable 
------------------+-----------+-------------
 analysis_version | text      | YES
 source_reference | text      | YES
```

### 7. Verify rag_queries Enhancements
```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'rag_queries' 
AND column_name IN ('provider', 'latency_ms', 'tokens_used', 'status')
ORDER BY column_name;
```
**Expected Output:**
```
 column_name | data_type | is_nullable | column_default 
-------------+-----------+-------------+----------------
 latency_ms  | integer   | YES         | 
 provider    | text      | YES         | 
 status      | text      | NO          | 'completed'
 tokens_used | integer   | YES         | 
```

### 8. Check rag_queries Indexes
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'rag_queries'
AND indexname IN ('idx_rag_queries_status', 'idx_rag_queries_provider', 'idx_rag_queries_latency')
ORDER BY indexname;
```

### 9. Verify documents.type Flexibility
```sql
-- Check no restrictive constraint exists
SELECT 
    conname, 
    contype, 
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'documents'::regclass 
AND conname LIKE '%type%';
```
**Expected:** No rows (constraint should be removed)

### 10. Check Migration Version
```sql
SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 5;
```
**Expected Output:**
```
 version 
---------
 000011
 000010
 000009
 000008
 000007
 000006
```

---

## Functional Testing

### Test 1: Insert Financial Metric
```sql
INSERT INTO financial_metrics (
    tenant_id, 
    metric_name, 
    metric_value, 
    metadata
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'burn_rate',
    15000.50,
    '{"calculation_method": "30_day_average", "confidence": 0.95}'::jsonb
) RETURNING *;
```

### Test 2: Query Financial Metrics
```sql
SELECT 
    metric_name,
    metric_value,
    created_at,
    metadata->>'calculation_method' as method
FROM financial_metrics
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
ORDER BY created_at DESC
LIMIT 5;
```

### Test 3: Update cash_analyses with New Fields
```sql
UPDATE cash_analyses 
SET 
    source_reference = 'ingestion_job_12345',
    analysis_version = 'v2.0'
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
RETURNING id, source_reference, analysis_version;
```

### Test 4: Insert RAG Query with Observability
```sql
INSERT INTO rag_queries (
    tenant_id,
    question,
    answer,
    provider,
    latency_ms,
    tokens_used,
    status
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'What is our burn rate?',
    'Your current burn rate is 15,000 SAR per day.',
    'openai',
    1250,
    450,
    'completed'
) RETURNING *;
```

### Test 5: Query RAG Performance Metrics
```sql
SELECT 
    provider,
    COUNT(*) as query_count,
    AVG(latency_ms) as avg_latency,
    SUM(tokens_used) as total_tokens,
    COUNT(*) FILTER (WHERE status = 'completed') as successful,
    COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM rag_queries
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
GROUP BY provider;
```

---

## Performance Checks

### Check Index Usage
```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('document_chunks', 'financial_metrics', 'rag_queries')
ORDER BY tablename, indexname;
```

### Check Table Sizes
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('document_chunks', 'financial_metrics', 'cash_analyses', 'rag_queries')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Rollback Instructions

If you need to rollback the migrations:

```bash
cd /Users/adam/Desktop/tad/tadfuq-platform/backend/migrations

# Rollback in reverse order
psql -h localhost -U postgres -d financial_rag -f 000011_verify_documents_type.down.sql
psql -h localhost -U postgres -d financial_rag -f 000010_enhance_rag_queries.down.sql
psql -h localhost -U postgres -d financial_rag -f 000009_enhance_cash_analyses.down.sql
psql -h localhost -U postgres -d financial_rag -f 000008_create_financial_metrics.down.sql
psql -h localhost -U postgres -d financial_rag -f 000007_add_embedding_vector_column.down.sql
psql -h localhost -U postgres -d financial_rag -f 000006_enable_pgvector.down.sql
```

---

## Common Issues and Solutions

### Issue 1: pgvector Extension Not Available
**Error:** `ERROR: extension "vector" is not available`

**Solution:**
```bash
# Install pgvector
brew install pgvector  # macOS
# or
sudo apt-get install postgresql-15-pgvector  # Ubuntu

# Restart PostgreSQL
brew services restart postgresql@15
```

### Issue 2: ivfflat Index Creation Fails
**Error:** `ERROR: insufficient data for ivfflat index`

**Solution:** This is expected if you have fewer than 1000 chunks. The index will be created but may not be used until you have more data. This is normal and safe.

### Issue 3: Duplicate Column Error
**Error:** `ERROR: column "embedding_vector" already exists`

**Solution:** The migration has already been run. Check migration version:
```sql
SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;
```

---

## Success Criteria Checklist

- [ ] pgvector extension installed
- [ ] document_chunks has both embedding columns
- [ ] document_chunks has vector index
- [ ] financial_metrics table created with all columns
- [ ] financial_metrics has 5 indexes
- [ ] cash_analyses has source_reference and analysis_version columns
- [ ] rag_queries has provider, latency_ms, tokens_used, status columns
- [ ] rag_queries has new indexes
- [ ] documents.type has no restrictive constraint
- [ ] Go backend compiles without errors
- [ ] All test queries execute successfully
- [ ] Migration version is 000011

---

## Next Steps After Verification

1. **Deploy Application Code**
   - The Go code changes are backward compatible
   - Deploy updated backend service
   - Monitor logs for any errors

2. **Monitor Performance**
   - Watch query latency on document_chunks
   - Monitor index usage statistics
   - Track RAG query performance metrics

3. **Backfill Embeddings** (Future Task)
   - Create script to convert existing TEXT embeddings to pgvector
   - Run backfill during low-traffic period
   - Verify data integrity after backfill

4. **Start Using New Features**
   - Begin tracking financial metrics in financial_metrics table
   - Add source_reference and analysis_version to new analyses
   - Populate observability fields in RAG queries

---

## Support

If you encounter any issues during migration:

1. Check PostgreSQL logs: `tail -f /usr/local/var/log/postgresql@15.log`
2. Verify database connection: `psql -h localhost -U postgres -d financial_rag`
3. Review migration files for syntax errors
4. Consult the rollback instructions above
5. Restore from backup if necessary

**Database:** `financial_rag`  
**User:** `postgres`  
**Port:** `5432`
