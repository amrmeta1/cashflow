# 🚀 نشر Frontend - جاهز الآن!

## ✅ تم الانتهاء من التحضير

**Build Status:** ✅ نجح  
**Package:** ✅ `frontend/deployment.zip` جاهز  
**Amplify App:** ✅ مُهيأ ومُعد  

---

## 📦 الملف الجاهز للرفع

```
frontend/deployment.zip
الحجم: ~50-100 MB
المحتوى: Next.js build + source code
```

---

## 🎯 خطوات النشر (3 دقائق)

### **الطريقة 1: رفع يدوي (الأسرع)**

1. **افتح Amplify Console:**
   ```
   https://console.aws.amazon.com/amplify/home?region=me-south-1#/d1pdf5yf8mnktj
   ```

2. **اضغط "Deploy without Git provider"**

3. **ارفع الملف:**
   - اسحب `frontend/deployment.zip` إلى المنطقة المخصصة
   - أو اضغط "Choose files" واختر الملف

4. **انتظر Build** (5-10 دقائق)

5. **افتح التطبيق:**
   ```
   https://d1pdf5yf8mnktj.amplifyapp.com
   ```

---

### **الطريقة 2: الربط مع Git (للتحديثات التلقائية)**

إذا كان الكود على GitHub:

1. **في نفس Console، اضغط "Connect branch"**

2. **اختر GitHub** وسجل الدخول

3. **اختر:**
   - Repository: `tadfuq-platform`
   - Branch: `main`
   - Monorepo path: `frontend`

4. **Build settings** (تلقائي):
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
   ```

5. **Save and deploy**

---

## 🌐 بعد النشر

### **1. تحديث CORS في Backend**

```bash
cd backend/cmd/tenant-service
```

أضف في CORS configuration:

```go
AllowedOrigins: []string{
    "https://d1pdf5yf8mnktj.amplifyapp.com",
    "https://app.TadFuq.ai", // بعد إضافة custom domain
    "http://localhost:3000",
}
```

ثم أعد نشر:

```bash
cd ../../
docker buildx build --platform linux/amd64 -t cashflow/tenant-service:latest -f ../infra/docker/Dockerfile . --load
docker tag cashflow/tenant-service:latest 747253121951.dkr.ecr.me-south-1.amazonaws.com/cashflow/tenant-service:latest
docker push 747253121951.dkr.ecr.me-south-1.amazonaws.com/cashflow/tenant-service:latest

aws ecs update-service --cluster cashflow-dev-cluster --service cashflow-dev-tenant --force-new-deployment --region me-south-1
```

### **2. إضافة Custom Domain (اختياري)**

في Amplify Console → **Domain management**:

1. اضغط **Add domain**
2. أدخل: `TadFuq.ai`
3. Subdomain: `app`
4. سيعطيك CNAME record
5. أضفه في Route53:

```bash
cd infra/terraform
```

أضف في `route53.tf`:

```hcl
resource "aws_route53_record" "app" {
  zone_id = local.hosted_zone_id
  name    = "app.TadFuq.ai"
  type    = "CNAME"
  ttl     = 300
  records = ["<amplify-cname>.cloudfront.net"]
}
```

```bash
terraform apply
```

---

## ✅ التحقق من النشر

بعد اكتمال Build:

```bash
# اختبر الصفحة الرئيسية
curl -I https://d1pdf5yf8mnktj.amplifyapp.com

# افتح في المتصفح
open https://d1pdf5yf8mnktj.amplifyapp.com
```

**تحقق من:**
- ✅ الصفحة تفتح بدون أخطاء
- ✅ API requests تذهب إلى `https://api.TadFuq.ai`
- ✅ لا توجد CORS errors في Console

---

## 📊 الحالة النهائية

```
✅ Backend:         https://api.TadFuq.ai
✅ Database:        PostgreSQL (all tables)
✅ Frontend Build:  Completed
✅ Package:         deployment.zip ready
⏳ Deployment:      Waiting for upload
```

---

## 🎯 ابدأ الآن!

**افتح هذا الرابط وارفع الملف:**

```
https://console.aws.amazon.com/amplify/home?region=me-south-1#/d1pdf5yf8mnktj
```

**الملف الجاهز:**
```
/Users/adam/Desktop/tad/tadfuq-platform/frontend/deployment.zip
```

---

## 💡 نصائح

- **Build time:** 5-10 دقائق عادة
- **إذا فشل Build:** راجع logs في Amplify Console
- **للتحديثات:** ارفع zip جديد أو استخدم Git
- **Custom domain:** يستغرق 5-10 دقائق للـ SSL

---

**كل شيء جاهز! فقط ارفع الملف وانتظر.** 🚀
