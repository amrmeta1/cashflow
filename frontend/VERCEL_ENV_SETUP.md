# Vercel Environment Variables Setup

## 🔧 إصلاح Server Error في Login

المشكلة: **"There is a problem with the server configuration"**

السبب: Environment variables مش موجودة على Vercel

---

## ✅ الحل: إضافة Environment Variables

### **الخطوة 1: اذهب إلى Vercel Dashboard**

1. افتح: https://vercel.com/dashboard
2. اختر المشروع: `tadfuq-platform`
3. اذهب إلى **Settings** → **Environment Variables**

---

### **الخطوة 2: أضف المتغيرات التالية**

#### **1. NextAuth Configuration (مطلوب)**

```
NEXTAUTH_URL
```
**Value:** `https://your-project-name.vercel.app`
(استبدل بالرابط الفعلي للمشروع على Vercel)

**Environment:** Production, Preview, Development

---

```
NEXTAUTH_SECRET
```
**Value:** قم بتوليد secret عشوائي 32 حرف
**كيف تولده:**
```bash
openssl rand -base64 32
```
أو استخدم: https://generate-secret.vercel.app/32

**Environment:** Production, Preview, Development

---

#### **2. Keycloak Configuration (للـ Authentication)**

```
KEYCLOAK_ISSUER
```
**Value:** `https://your-keycloak-server.com/realms/cashflow`
(استبدل برابط Keycloak server الخاص بك)

**Environment:** Production

---

```
KEYCLOAK_CLIENT_ID
```
**Value:** `cashflow-api`

**Environment:** Production

---

```
KEYCLOAK_CLIENT_SECRET
```
**Value:** السر الخاص بـ Keycloak client

**Environment:** Production

---

#### **3. Backend API URLs**

```
NEXT_PUBLIC_API_BASE_URL
```
**Value:** `https://api.tadfuq.com`
(استبدل برابط Backend API الخاص بك)

**Environment:** Production, Preview, Development

---

```
NEXT_PUBLIC_INGESTION_API_BASE_URL
```
**Value:** `https://ingestion.tadfuq.com`
(استبدل برابط Ingestion API الخاص بك)

**Environment:** Production, Preview, Development

---

#### **4. Optional: Dev/Mock Settings**

```
NEXT_PUBLIC_ENABLE_MOCKS
```
**Value:** `false`

**Environment:** Development, Preview

---

```
NEXT_PUBLIC_DEV_SKIP_AUTH
```
**Value:** `false` (للـ production)
**Value:** `true` (للتجربة بدون authentication)

**Environment:** Development, Preview

---

## 🚀 بعد إضافة المتغيرات

### **الخطوة 3: Redeploy المشروع**

1. في Vercel Dashboard → اذهب إلى **Deployments**
2. اختر آخر deployment
3. اضغط على **⋯** (three dots)
4. اختر **Redeploy**
5. انتظر حتى ينتهي الـ build

---

## 🔒 أمان Environment Variables

### **متغيرات سرية (لا تشاركها):**
- ❌ `NEXTAUTH_SECRET`
- ❌ `KEYCLOAK_CLIENT_SECRET`

### **متغيرات عامة (آمنة للمشاركة):**
- ✅ `NEXT_PUBLIC_API_BASE_URL`
- ✅ `NEXT_PUBLIC_ENABLE_MOCKS`

**ملاحظة:** أي متغير يبدأ بـ `NEXT_PUBLIC_` يكون مرئي في الـ client-side

---

## 📋 Quick Copy-Paste Template

```env
# NextAuth
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=your-32-char-random-secret

# Keycloak
KEYCLOAK_ISSUER=https://your-keycloak.com/realms/cashflow
KEYCLOAK_CLIENT_ID=cashflow-api
KEYCLOAK_CLIENT_SECRET=your-keycloak-secret

# Backend APIs
NEXT_PUBLIC_API_BASE_URL=https://api.tadfuq.com
NEXT_PUBLIC_INGESTION_API_BASE_URL=https://ingestion.tadfuq.com

# Optional
NEXT_PUBLIC_ENABLE_MOCKS=false
NEXT_PUBLIC_DEV_SKIP_AUTH=false
```

---

## 🧪 للتجربة بدون Backend

إذا كنت تريد تجربة الموقع بدون backend server:

```env
NEXT_PUBLIC_DEV_SKIP_AUTH=true
NEXT_PUBLIC_ENABLE_MOCKS=true
```

هذا سيسمح لك بالدخول بدون login وسيستخدم mock data

---

## ✅ التحقق من نجاح الإعداد

بعد الـ redeploy:

1. افتح الموقع: `https://your-project.vercel.app`
2. اذهب إلى `/login`
3. يجب أن تظهر صفحة login بدون errors
4. جرب تسجيل الدخول

---

## 🐛 Troubleshooting

### **لا يزال Server Error؟**

**تحقق من:**
1. ✅ جميع المتغيرات المطلوبة موجودة
2. ✅ `NEXTAUTH_URL` يطابق رابط Vercel بالضبط
3. ✅ `NEXTAUTH_SECRET` موجود وليس فارغ
4. ✅ تم عمل Redeploy بعد إضافة المتغيرات

**شاهد الـ logs:**
1. Vercel Dashboard → Deployments
2. اختر آخر deployment
3. اضغط **View Function Logs**
4. ابحث عن الأخطاء

---

### **Keycloak مش شغال؟**

**تأكد من:**
1. ✅ Keycloak server شغال ومتاح على الإنترنت
2. ✅ `KEYCLOAK_ISSUER` صحيح
3. ✅ Redirect URIs في Keycloak تتضمن:
   - `https://your-project.vercel.app/api/auth/callback/keycloak`
4. ✅ Client credentials صحيحة

---

### **Backend API مش شغال؟**

**تأكد من:**
1. ✅ Backend server شغال ومتاح
2. ✅ CORS مفعل للـ Vercel domain
3. ✅ API URLs صحيحة

---

## 📞 المساعدة

إذا استمرت المشكلة:
1. تحقق من Function Logs في Vercel
2. تحقق من Browser Console (F12)
3. تحقق من Network tab للـ API calls

---

**Last Updated:** March 4, 2026
