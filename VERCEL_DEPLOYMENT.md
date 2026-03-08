# 🚀 نشر المشروع على Vercel

## ✅ الإعدادات جاهزة!

تم تجهيز المشروع للنشر على Vercel بنجاح.

---

## 📋 خطوات النشر

### 1️⃣ إنشاء حساب على Vercel

اذهب إلى: **https://vercel.com/signup**

اختر **Continue with GitHub** لربط حسابك

---

### 2️⃣ استيراد المشروع

بعد تسجيل الدخول:

1. اضغط على **"Add New..."** → **"Project"**
2. ابحث عن repository: **`tadfuq-platform`**
3. اضغط **"Import"**

---

### 3️⃣ تكوين المشروع

في صفحة التكوين:

#### **Framework Preset:**
- اختر: **Next.js**

#### **Root Directory:**
- اترك فارغاً أو اختر: **`frontend`**

#### **Build Command:**
```bash
npm run build
```

#### **Output Directory:**
```bash
.next
```

#### **Install Command:**
```bash
npm install
```

---

### 4️⃣ Environment Variables (اختياري)

إذا كنت تريد ربط Backend API:

```
NEXT_PUBLIC_API_URL=https://your-backend-api.com
NEXT_PUBLIC_TENANT_API_URL=https://your-backend-api.com
NEXT_PUBLIC_INGESTION_API_URL=https://your-backend-api.com
```

**ملاحظة:** حالياً، Frontend سيعمل بدون Backend (demo mode)

---

### 5️⃣ النشر

1. اضغط **"Deploy"**
2. انتظر 2-3 دقائق
3. ✅ **تم النشر!**

---

## 🌐 الوصول للموقع

بعد النشر الناجح، ستحصل على رابط مثل:

```
https://tadfuq-platform.vercel.app
```

أو

```
https://tadfuq-platform-<username>.vercel.app
```

---

## 🔄 النشر التلقائي

**من الآن فصاعداً:**
- كل `git push` لـ `main` branch → نشر تلقائي على Vercel
- كل Pull Request → معاينة تلقائية (Preview Deployment)

---

## 🎨 Domain مخصص (اختياري)

إذا كان لديك domain خاص:

1. اذهب لـ **Project Settings** → **Domains**
2. أضف domain الخاص بك
3. اتبع تعليمات DNS

---

## ⚙️ الملفات المُنشأة

- ✅ `vercel.json` - تكوين Vercel
- ✅ `frontend/next.config.js` - مُعد لـ Vercel
- ✅ هذا الملف - دليل النشر

---

## 🐛 استكشاف الأخطاء

### إذا فشل البناء:

1. **تحقق من Logs:**
   - في Vercel Dashboard → Deployments → اضغط على آخر deployment
   - اقرأ Build Logs

2. **تحقق من Root Directory:**
   - تأكد أنه مضبوط على `frontend`

3. **تحقق من Build Command:**
   ```bash
   cd frontend && npm run build
   ```

---

## 📊 المميزات

✅ **مجاني للمشاريع الشخصية**
✅ **SSL تلقائي (HTTPS)**
✅ **CDN عالمي**
✅ **نشر تلقائي من GitHub**
✅ **معاينة للـ Pull Requests**
✅ **Analytics مدمج**
✅ **Edge Functions**

---

## 🎯 الخطوات التالية

### بعد النشر الناجح:

1. **اختبر الموقع:**
   - افتح الرابط الذي أعطاك Vercel
   - تأكد من عمل جميع الصفحات

2. **إذا أردت ربط Backend:**
   - انشر Backend على Railway/Render/Fly.io
   - أضف Environment Variables في Vercel
   - أعد النشر

3. **شارك الرابط:**
   - الموقع جاهز للمشاركة!

---

## 📞 الدعم

- **Vercel Docs:** https://vercel.com/docs
- **Next.js on Vercel:** https://vercel.com/docs/frameworks/nextjs
- **Community:** https://github.com/vercel/vercel/discussions

---

**جاهز للنشر! 🚀**

افتح https://vercel.com واتبع الخطوات أعلاه.
