# 🔧 حل مشكلة Amplify - الخطوات النهائية

## 🎯 المشكلة

Amplify deployment نجح لكن التطبيق يظهر 404 لأن:
- رفعنا zip يدوياً بدون build
- Amplify لم يقم ببناء Next.js application
- يحتاج Git connection لكي يبني التطبيق بشكل صحيح

---

## ✅ الحل (3 دقائق)

### **الخطوة 1: افتح Amplify Console**

```
https://console.aws.amazon.com/amplify/home?region=me-south-1#/d1pdf5yf8mnktj
```

### **الخطوة 2: اضغط "Connect branch"**

في الصفحة الرئيسية للـ app، ستجد زر **"Connect branch"** أو **"Connect repository"**

### **الخطوة 3: اختر GitHub**

1. اختر **GitHub** كـ Git provider
2. سجل الدخول إلى GitHub
3. اختر repository: **`amrmeta1/cashflow`**
4. اختر branch: **`refactor/monorepo-structure`** (أو `main` إذا كنت تريد)

### **الخطوة 4: Configure build settings**

**Monorepo settings:**
- App root directory: `frontend`

**Build settings** (سيتم اكتشافها تلقائياً):
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/.next
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
```

### **الخطوة 5: Environment Variables**

تأكد من وجود:
```
NEXT_PUBLIC_API_URL=https://api.TadFuq.ai
NEXT_PUBLIC_TENANT_API_URL=https://api.TadFuq.ai/api/tenant
NEXT_PUBLIC_INGESTION_API_URL=https://api.TadFuq.ai/api/ingestion
NEXT_PUBLIC_APP_NAME=CashFlow.ai
```

### **الخطوة 6: Save and Deploy**

اضغط **"Save and deploy"** وانتظر 5-10 دقائق

---

## 📊 بعد النشر

سيكون التطبيق متاح على:
```
https://refactor-monorepo-structure.d1pdf5yf8mnktj.amplifyapp.com
```

أو إذا اخترت main branch:
```
https://main.d1pdf5yf8mnktj.amplifyapp.com
```

---

## 🔄 البديل: إذا لم تستطع ربط GitHub

يمكنك استخدام **AWS CodeCommit** بدلاً من GitHub:

```bash
# 1. إنشاء CodeCommit repository
aws codecommit create-repository \
  --repository-name cashflow-frontend \
  --region me-south-1

# 2. إضافة remote
git remote add codecommit <codecommit-url>

# 3. Push الكود
git push codecommit refactor/monorepo-structure

# 4. ربط Amplify بـ CodeCommit
```

---

## ⚡ الحل الأسرع (إذا كنت مستعجل)

استخدم **Netlify** بدلاً من Amplify:

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Login
netlify login

# 3. Deploy
cd frontend
netlify deploy --prod --dir=.next
```

---

## 💡 ملاحظة مهمة

بمجرد ربط Git، كل push جديد سيؤدي إلى:
- ✅ Build تلقائي
- ✅ Deploy تلقائي
- ✅ Preview لكل Pull Request

---

**اختر الطريقة الأنسب لك وأخبرني!**
