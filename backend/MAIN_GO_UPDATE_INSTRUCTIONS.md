# تحديث ملف main.go - تعليمات التنفيذ

## المشكلة
السيرفر شغال لكن رفع الملفات فاشل لأن الـ routes مش موجودة.

## الحل

### 1. افتح ملف `cmd/ingestion-service/main.go`

### 2. استبدل السطر 175 (بناء الـ router) بهذا الكود:

```go
// Build router
router := httpAdapter.NewIngestionRouter(httpAdapter.IngestionRouterDeps{
	Validator:   jwtValidator,
	Users:       userRepo,
	Memberships: membershipRepo,
	AuditRepo:   auditRepo,
	Ingestion:   ingestionHandler,
	Analysis:    analysisHandler,
	Forecast:    forecastHandler,
	CashStory:   cashStoryHandler,
	Decision:    ragBootstrap.DecisionHandler,
	RAGDocument: ragBootstrap.DocumentHandler,  // 👈 أضف هذا
	RAGQuery:    ragBootstrap.RagHandler,       // 👈 وهذا
})
```

### 3. احفظ الملف وأعد تشغيل السيرفر

```bash
cd backend
go run cmd/ingestion-service/main.go
```

## الـ Routes الجديدة

بعد التحديث، هتكون الـ routes التالية متاحة:

### رفع المستندات
```
POST /tenants/{tenantID}/documents
```

### عرض المستندات
```
GET /tenants/{tenantID}/documents
```

### حذف مستند
```
DELETE /tenants/{tenantID}/documents/{documentID}
```

### الاستعلام بالـ AI
```
POST /tenants/{tenantID}/rag/query
```

## اختبار رفع الملف

بعد إعادة تشغيل السيرفر:

```bash
curl -X POST http://localhost:8080/tenants/{tenantID}/documents \
  -F "title=Test Document" \
  -F "type=pdf" \
  -F "file=@document.pdf"
```

## ملاحظات مهمة

✅ الـ router تم تحديثه بنجاح
✅ الـ RAG handlers جاهزة
✅ فقط تحتاج تمرير الـ handlers في main.go
✅ بعدها رفع الملفات هيشتغل مباشرة

---

**السطران المطلوب إضافتهما:**
```go
RAGDocument: ragBootstrap.DocumentHandler,
RAGQuery:    ragBootstrap.RagHandler,
```
