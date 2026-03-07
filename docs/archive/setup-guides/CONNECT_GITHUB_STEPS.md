# 🔗 ربط GitHub بـ Amplify - خطوات مفصلة

## 📋 الخطوات (5 دقائق)

### **1. افتح Amplify Console**

اضغط على هذا الرابط:
```
https://console.aws.amazon.com/amplify/home?region=me-south-1#/d1pdf5yf8mnktj
```

---

### **2. Connect Repository**

في صفحة App الرئيسية:

1. ابحث عن زر **"Connect branch"** أو **"Host web app"**
2. اضغط عليه
3. اختر **GitHub** من قائمة Git providers

---

### **3. Authorize GitHub**

1. سيفتح نافذة GitHub
2. سجل الدخول إلى حسابك: `amrmeta1`
3. اضغط **"Authorize AWS Amplify"**
4. قد يطلب منك إدخال password

---

### **4. Select Repository & Branch**

**Repository:**
```
amrmeta1/cashflow
```

**Branch:**
```
refactor/monorepo-structure
```
(أو `main` إذا كنت تفضل)

**App root directory (مهم جداً!):**
```
frontend
```

اضغط **Next**

---

### **5. Build Settings**

Amplify سيكتشف Next.js تلقائياً. تأكد من الإعدادات:

**Build specification:**
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
  cache:
    paths:
      - node_modules/**/*
```

**إذا لم تظهر تلقائياً:**
- اضغط **Edit**
- الصق الكود أعلاه
- اضغط **Save**

---

### **6. Environment Variables**

تأكد من وجود المتغيرات (موجودة بالفعل):

```
NEXT_PUBLIC_API_URL=https://api.TadFuq.ai
NEXT_PUBLIC_TENANT_API_URL=https://api.TadFuq.ai/api/tenant
NEXT_PUBLIC_INGESTION_API_URL=https://api.TadFuq.ai/api/ingestion
NEXT_PUBLIC_APP_NAME=CashFlow.ai
NEXT_PUBLIC_APP_URL=https://refactor-monorepo-structure.d1pdf5yf8mnktj.amplifyapp.com
NEXTAUTH_URL=https://refactor-monorepo-structure.d1pdf5yf8mnktj.amplifyapp.com
```

اضغط **Next**

---

### **7. Review & Save**

1. راجع جميع الإعدادات
2. اضغط **"Save and deploy"**
3. انتظر Build (5-10 دقائق)

---

## 📊 مراقبة Build

بعد الضغط على Deploy:

1. ستظهر صفحة Build progress
2. راقب المراحل:
   - ✅ Provision (30 ثانية)
   - ✅ Build (3-5 دقائق)
   - ✅ Deploy (1-2 دقيقة)
   - ✅ Verify (30 ثانية)

---

## 🌐 بعد اكتمال Build

التطبيق سيكون متاح على:

```
https://refactor-monorepo-structure.d1pdf5yf8mnktj.amplifyapp.com
```

---

## ✅ التحقق

```bash
# اختبر التطبيق
curl -I https://refactor-monorepo-structure.d1pdf5yf8mnktj.amplifyapp.com

# يجب أن ترى:
# HTTP/2 200
# content-type: text/html
```

---

## 🔄 Continuous Deployment

بعد الربط، كل مرة تعمل `git push`:
- ✅ Amplify سيبني التطبيق تلقائياً
- ✅ سينشره تلقائياً
- ✅ ستحصل على preview لكل Pull Request

---

## ⚠️ إذا واجهت مشكلة

### **مشكلة: Build fails**

افتح Build logs وابحث عن الخطأ:
```
https://console.aws.amazon.com/amplify/home?region=me-south-1#/d1pdf5yf8mnktj/YourBranch/YourBuildId
```

### **مشكلة: لا يمكن الوصول لـ GitHub**

تأكد من:
- GitHub account مفعّل
- Repository public أو لديك permissions
- AWS Amplify مُصرّح له بالوصول

---

## 📞 أخبرني

بعد ما تخلص الخطوات، أخبرني:
- ✅ Build نجح
- ❌ Build فشل (وأرسل لي الخطأ)
- ❓ عندك سؤال في أي خطوة

---

**ابدأ الآن من الخطوة 1!** 🚀
