# الحل النهائي - مشكلة رفع المستندات

## الملخص
السيرفر شغال ✅  
الجداول موجودة في قاعدة البيانات ✅  
لكن السيرفر ما يقدر يوصل للجداول ❌

## المشكلة المحتملة
السيرفر يتصل بـ schema أو database مختلف عن اللي فيه الجداول.

## الحل المؤقت (للاختبار السريع)
استخدم الـ frontend مباشرة على **port 8081** بدل 8080:

1. افتح ملف `frontend/.env.local` أو `frontend/.env`
2. غير الـ API URL:
```bash
NEXT_PUBLIC_INGESTION_API_BASE_URL=http://localhost:8081
```

3. أعد تشغيل الـ frontend:
```bash
cd frontend
npm run dev
```

4. جرب رفع ملف من الواجهة

## الحل الدائم (يحتاج وقت)

### الخيار 1: إعادة إنشاء قاعدة البيانات
```bash
# أوقف السيرفرات
pkill -f "go run"

# احذف قاعدة البيانات وأعد إنشائها
docker exec -i cashflow-postgres psql -U cashflow -c "DROP DATABASE IF EXISTS cashflow;"
docker exec -i cashflow-postgres psql -U cashflow -c "CREATE DATABASE cashflow;"

# شغل الـ migrations
cd backend/migrations
docker exec -i cashflow-postgres psql -U cashflow -d cashflow < 000001_init_schema.up.sql
docker exec -i cashflow-postgres psql -U cashflow -d cashflow < 000002_ingestion_schema.up.sql
docker exec -i cashflow-postgres psql -U cashflow -d cashflow < 000003_create_cash_analyses.up.sql
docker exec -i cashflow-postgres psql -U cashflow -d cashflow < 000004_rag_documents.up.sql

# شغل السيرفر
cd ..
AUTH_DEV_MODE=true VOYAGE_API_KEY="pa-lF0fXb_bBr2jUeYlz79p2WOrZnG9MhrjYh2Otv7H6yn" go run cmd/ingestion-service/main.go
```

### الخيار 2: استخدام golang-migrate
```bash
# ثبت golang-migrate
brew install golang-migrate

# شغل الـ migrations
migrate -path backend/migrations -database "postgresql://cashflow:cashflow@localhost:5432/cashflow?sslmode=disable" up
```

### الخيار 3: تحقق من الـ schema
```sql
-- في PostgreSQL client
SET search_path TO public;
CREATE TABLE IF NOT EXISTS public.documents (...);
```

## الخلاصة
المشكلة في الـ database connection/schema. الحل المؤقت هو استخدام port 8081 مباشرة من الـ frontend.

الحل الدائم يحتاج إعادة إنشاء قاعدة البيانات بشكل صحيح باستخدام الـ migrations.

---

**جرب الحل المؤقت الآن عشان تقدر تكمل الاختبار! 🚀**
