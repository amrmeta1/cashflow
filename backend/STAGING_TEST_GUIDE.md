# دليل الاختبار على Staging - البنية الجديدة

## 🎯 نظرة عامة

هذا الدليل يشرح كيفية اختبار البنية الجديدة على بيئة Staging قبل النشر للإنتاج.

## 📋 المتطلبات الأولية

### 1. البيئة
- ✅ Staging server متاح
- ✅ PostgreSQL database (staging)
- ✅ NATS server مع JetStream
- ✅ Docker و Docker Compose
- ✅ الوصول إلى staging environment

### 2. الأدوات
```bash
# تثبيت الأدوات المطلوبة
brew install nats-io/nats-tools/nats  # NATS CLI
brew install postgresql@14             # PostgreSQL client
brew install jq                        # JSON processor
```

## 🚀 خطوات النشر على Staging

### الخطوة 1: تحضير الكود

```bash
# 1. تأكد من أن development branch محدث
cd /Users/adam/Desktop/tad/tadfuq-platform
git checkout development
git pull origin development

# 2. تأكد من أن جميع الاختبارات تعمل محلياً
cd backend
go test ./internal/...
go test ./cmd/...

# 3. بناء الخدمات
go build -o bin/tenant-service cmd/tenant-service/main.go
go build -o bin/ingestion-service cmd/ingestion-service-v2/main.go

# 4. التحقق من البناء
./bin/tenant-service --version
./bin/ingestion-service --version
```

### الخطوة 2: بناء Docker Images

```bash
# 1. بناء Tenant Service
docker build -t tadfuq/tenant-service:staging \
  -f deployments/docker/Dockerfile.tenant \
  --build-arg VERSION=2.0.0-staging \
  .

# 2. بناء Ingestion Service
docker build -t tadfuq/ingestion-service:staging \
  -f deployments/docker/Dockerfile.ingestion \
  --build-arg VERSION=2.0.0-staging \
  .

# 3. التحقق من الـ images
docker images | grep tadfuq
```

### الخطوة 3: رفع Images إلى Registry

```bash
# 1. تسجيل الدخول إلى Docker registry
docker login registry.tadfuq.com

# 2. رفع الـ images
docker push tadfuq/tenant-service:staging
docker push tadfuq/ingestion-service:staging

# 3. التحقق
docker pull tadfuq/tenant-service:staging
docker pull tadfuq/ingestion-service:staging
```

### الخطوة 4: تحضير قاعدة البيانات

```bash
# 1. الاتصال بـ staging database
psql -h staging-db.tadfuq.com -U postgres -d cashflow_staging

# 2. أخذ نسخة احتياطية
pg_dump -h staging-db.tadfuq.com -U postgres cashflow_staging \
  > backup_staging_$(date +%Y%m%d_%H%M%S).sql

# 3. تشغيل الـ migrations (إذا كانت موجودة)
# migrate -path migrations -database "postgresql://..." up

# 4. التحقق من الجداول
\dt
SELECT COUNT(*) FROM bank_transactions;
```

### الخطوة 5: تشغيل NATS على Staging

```bash
# 1. SSH إلى staging server
ssh staging.tadfuq.com

# 2. تشغيل NATS مع JetStream
nats-server -js -c /etc/nats/nats-server.conf

# 3. التحقق من NATS
nats server check
nats server info

# 4. إنشاء الـ streams
nats stream add CASHFLOW \
  --subjects "cashflow.*" \
  --storage file \
  --retention workqueue \
  --max-msgs=-1 \
  --max-age=7d
```

### الخطوة 6: نشر الخدمات

```bash
# استخدام Docker Compose
cd deployments/staging

# 1. تحديث docker-compose.yml
cat > docker-compose.staging.yml <<EOF
version: '3.8'

services:
  nats:
    image: nats:latest
    command: ["-js", "-m", "8222"]
    ports:
      - "4222:4222"
      - "8222:8222"
    volumes:
      - nats-data:/data

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: cashflow_staging
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  tenant-service:
    image: tadfuq/tenant-service:staging
    environment:
      - DATABASE_URL=postgresql://postgres:\${DB_PASSWORD}@postgres:5432/cashflow_staging
      - NATS_URL=nats://nats:4222
      - PORT=8080
      - ENABLE_PIPELINE_WORKER=true
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - nats
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  ingestion-service:
    image: tadfuq/ingestion-service:staging
    environment:
      - DATABASE_URL=postgresql://postgres:\${DB_PASSWORD}@postgres:5432/cashflow_staging
      - NATS_URL=nats://nats:4222
      - PORT=8081
    ports:
      - "8081:8081"
    depends_on:
      - postgres
      - nats
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/health"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  nats-data:
  postgres-data:
EOF

# 2. تشغيل الخدمات
docker-compose -f docker-compose.staging.yml up -d

# 3. التحقق من الخدمات
docker-compose -f docker-compose.staging.yml ps
docker-compose -f docker-compose.staging.yml logs -f
```

## 🧪 الاختبارات

### 1. اختبار Health Checks

```bash
# Tenant Service
curl http://staging.tadfuq.com:8080/health
# Expected: {"status":"healthy","timestamp":"..."}

# Ingestion Service
curl http://staging.tadfuq.com:8081/health
# Expected: {"status":"healthy","timestamp":"..."}

# NATS
nats server check
# Expected: All checks pass
```

### 2. اختبار رفع CSV

```bash
# إنشاء ملف اختبار
cat > test-staging.csv <<EOF
date,description,amount
2024-03-01,Test Transaction 1,1000.00
2024-03-02,Test Transaction 2,-500.00
2024-03-03,Test Transaction 3,750.00
EOF

# رفع الملف
TENANT_ID="your-tenant-id"
ACCOUNT_ID="your-account-id"

curl -X POST \
  http://staging.tadfuq.com:8081/api/v1/tenants/${TENANT_ID}/imports/csv \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-staging.csv" \
  -F "account_id=${ACCOUNT_ID}" \
  -v

# Expected Response (1-3 seconds):
# {
#   "job_id": "...",
#   "status": "processing",
#   "transactions_count": 3,
#   "message": "File uploaded successfully"
# }
```

### 3. التحقق من NATS Events

```bash
# الاستماع للأحداث
nats sub "cashflow.>" --server=nats://staging.tadfuq.com:4222

# في terminal آخر، ارفع ملف
# يجب أن ترى:
# [#1] Received on "cashflow.transactions.imported"
# {"tenant_id":"...","transaction_count":3,...}
```

### 4. التحقق من قاعدة البيانات

```bash
# الاتصال بقاعدة البيانات
psql -h staging-db.tadfuq.com -U postgres -d cashflow_staging

-- التحقق من المعاملات المستوردة
SELECT 
  id,
  tenant_id,
  txn_date,
  amount,
  description,
  created_at
FROM bank_transactions
WHERE tenant_id = 'your-tenant-id'
ORDER BY created_at DESC
LIMIT 10;

-- التحقق من الـ raw transactions
SELECT COUNT(*) FROM raw_bank_transactions
WHERE tenant_id = 'your-tenant-id';

-- التحقق من الـ ingestion jobs
SELECT 
  id,
  job_type,
  status,
  created_at,
  completed_at
FROM ingestion_jobs
WHERE tenant_id = 'your-tenant-id'
ORDER BY created_at DESC
LIMIT 5;
```

### 5. التحقق من Pipeline Worker

```bash
# مراقبة logs الـ pipeline worker
docker logs -f tenant-service | grep pipeline

# يجب أن ترى:
# pipeline worker started
# processing event from NATS
# step: ai_classification - completed in 2.3s
# step: vendor_stats - completed in 0.8s
# step: cashflow_dna - completed in 1.2s
# step: forecast - completed in 3.1s
# step: liquidity - completed in 1.5s
# step: analysis - completed in 2.0s
# pipeline execution completed in 11.2s
```

### 6. التحقق من التحليلات

```bash
# الحصول على التحليلات
curl http://staging.tadfuq.com:8080/api/v1/tenants/${TENANT_ID}/analysis \
  -H "Authorization: Bearer ${TOKEN}"

# Expected:
# {
#   "cashflow_summary": {...},
#   "vendor_stats": [...],
#   "patterns": [...],
#   "forecast": {...},
#   "liquidity": {...}
# }
```

### 7. اختبار الأداء

```bash
# اختبار الحمل - 100 ملف متزامن
cat > load-test.sh <<'EOF'
#!/bin/bash

STAGING_URL="http://staging.tadfuq.com:8081"
TENANT_ID="your-tenant-id"
ACCOUNT_ID="your-account-id"

for i in {1..100}; do
  (
    curl -X POST \
      "${STAGING_URL}/api/v1/tenants/${TENANT_ID}/imports/csv" \
      -H "Content-Type: multipart/form-data" \
      -F "file=@test-staging.csv" \
      -F "account_id=${ACCOUNT_ID}" \
      -w "\nTime: %{time_total}s\n" \
      -o /dev/null -s
  ) &
done

wait
echo "Load test completed"
EOF

chmod +x load-test.sh
./load-test.sh

# تحليل النتائج
# يجب أن يكون متوسط الوقت < 3 ثانية
```

## 📊 مراقبة Metrics

### 1. Prometheus Metrics

```bash
# Ingestion Service metrics
curl http://staging.tadfuq.com:8081/metrics | grep cashflow_ingestion

# Expected metrics:
# cashflow_ingestion_files_total{document_type="csv",status="success"} 100
# cashflow_ingestion_duration_seconds{document_type="csv"} 1.234
# cashflow_ingestion_transactions_inserted_total 300

# Pipeline metrics
curl http://staging.tadfuq.com:8080/metrics | grep cashflow_pipeline

# Expected metrics:
# cashflow_pipeline_executions_total{status="success"} 100
# cashflow_pipeline_step_duration_seconds{step="ai_classification"} 2.1
# cashflow_pipeline_failures_total{step="forecast"} 0
```

### 2. NATS Monitoring

```bash
# Stream info
nats stream info CASHFLOW --server=nats://staging.tadfuq.com:4222

# Consumer info
nats consumer ls CASHFLOW --server=nats://staging.tadfuq.com:4222

# Message count
nats stream view CASHFLOW --server=nats://staging.tadfuq.com:4222
```

### 3. Database Performance

```sql
-- Active connections
SELECT COUNT(*) FROM pg_stat_activity 
WHERE datname = 'cashflow_staging';

-- Slow queries
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## ✅ قائمة التحقق

### قبل الاختبار
- [ ] Staging environment جاهز
- [ ] Database backup تم أخذه
- [ ] Docker images تم بناؤها ورفعها
- [ ] NATS server يعمل
- [ ] جميع الخدمات healthy

### اختبارات وظيفية
- [ ] رفع CSV يعمل (< 3s)
- [ ] رفع PDF يعمل
- [ ] رفع Ledger يعمل
- [ ] Deduplication يعمل
- [ ] Vendor resolution يعمل
- [ ] NATS events تُنشر
- [ ] Pipeline worker يستهلك الأحداث
- [ ] AI classification يعمل
- [ ] Vendor stats تُحدث
- [ ] CashFlow DNA يُحسب
- [ ] Forecast يُولد
- [ ] Liquidity analysis يعمل
- [ ] Analysis API يُرجع بيانات صحيحة

### اختبارات الأداء
- [ ] Response time < 3s (متوسط)
- [ ] Pipeline execution < 30s
- [ ] 100 concurrent uploads ناجحة
- [ ] No memory leaks
- [ ] No connection leaks
- [ ] CPU usage < 70%
- [ ] Memory usage < 80%

### اختبارات الخطأ
- [ ] Invalid CSV format - error handled
- [ ] Missing columns - error handled
- [ ] Corrupted file - error handled
- [ ] NATS connection lost - retry works
- [ ] Database connection lost - retry works
- [ ] Duplicate transactions - deduplicated

### Monitoring
- [ ] Prometheus metrics تعمل
- [ ] Logs structured و readable
- [ ] NATS monitoring يعمل
- [ ] Database metrics تُجمع
- [ ] Alerts configured

## 🐛 استكشاف الأخطاء

### المشكلة: الخدمة لا تبدأ

```bash
# التحقق من logs
docker logs tenant-service
docker logs ingestion-service

# التحقق من environment variables
docker exec tenant-service env | grep DATABASE
docker exec tenant-service env | grep NATS

# التحقق من network
docker network ls
docker network inspect staging_default
```

### المشكلة: NATS events لا تُستهلك

```bash
# التحقق من NATS connection
nats server check --server=nats://staging.tadfuq.com:4222

# التحقق من consumer
nats consumer ls CASHFLOW --server=nats://staging.tadfuq.com:4222

# التحقق من pending messages
nats stream info CASHFLOW --server=nats://staging.tadfuq.com:4222

# إعادة تشغيل pipeline worker
docker restart tenant-service
```

### المشكلة: بطء في الأداء

```bash
# التحقق من CPU/Memory
docker stats

# التحقق من database connections
psql -h staging-db.tadfuq.com -U postgres -d cashflow_staging \
  -c "SELECT COUNT(*) FROM pg_stat_activity;"

# التحقق من slow queries
psql -h staging-db.tadfuq.com -U postgres -d cashflow_staging \
  -c "SELECT query, mean_exec_time FROM pg_stat_statements 
      ORDER BY mean_exec_time DESC LIMIT 5;"
```

## 📝 تقرير الاختبار

بعد الانتهاء من الاختبارات، املأ هذا التقرير:

```markdown
# Staging Test Report - [DATE]

## Environment
- Staging URL: http://staging.tadfuq.com
- Version: 2.0.0-staging
- Tester: [NAME]

## Test Results

### Functional Tests
- CSV Upload: ✅ PASS / ❌ FAIL
- PDF Upload: ✅ PASS / ❌ FAIL
- Pipeline Execution: ✅ PASS / ❌ FAIL
- Analysis Generation: ✅ PASS / ❌ FAIL

### Performance Tests
- Average Response Time: ___ seconds
- Pipeline Execution Time: ___ seconds
- Concurrent Uploads (100): ✅ PASS / ❌ FAIL
- Memory Usage: ___% 
- CPU Usage: ___%

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
- [ ] Ready for production
- [ ] Needs fixes before production
- [ ] Requires more testing

## Next Steps
1. 
2. 
3. 
```

## 🚀 الخطوة التالية

بعد نجاح الاختبارات على Staging:

1. **مراجعة النتائج** مع الفريق
2. **إصلاح أي مشاكل** تم اكتشافها
3. **تحديث التوثيق** إذا لزم الأمر
4. **إنشاء PR** من development إلى main
5. **التخطيط للنشر** على Production

---

**تم إعداده:** مارس 2026  
**الحالة:** جاهز للاستخدام  
**النسخة:** 2.0.0
