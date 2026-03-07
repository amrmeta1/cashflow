# 🚀 رفع Environment Variables على Vercel

## ملف `.env.vercel` جاهز للاستخدام!

---

## 📋 الطريقة 1: نسخ ولصق (الأسرع)

### الخطوات:

1. **افتح ملف `.env.vercel`** في المجلد

2. **انسخ كل المحتوى**

3. **اذهب إلى Vercel:**
   - https://vercel.com/dashboard
   - اختر المشروع: `tadfuq-platform`
   - **Settings** → **Environment Variables**

4. **أضف كل متغير:**

```
Name: NEXTAUTH_URL
Value: https://tadfuq-platform.vercel.app
Environments: ✅ Production ✅ Preview ✅ Development
```

```
Name: NEXTAUTH_SECRET
Value: 4Mg7bRimgvt4wXDreQDPBIgAbeNA4GfufOWb91Dwcus=
Environments: ✅ Production ✅ Preview ✅ Development
```

```
Name: NEXT_PUBLIC_DEV_SKIP_AUTH
Value: true
Environments: ✅ Production ✅ Preview ✅ Development
```

```
Name: NEXT_PUBLIC_ENABLE_MOCKS
Value: true
Environments: ✅ Production ✅ Preview ✅ Development
```

```
Name: NEXT_PUBLIC_API_BASE_URL
Value: https://api.tadfuq.com
Environments: ✅ Production ✅ Preview ✅ Development
```

```
Name: NEXT_PUBLIC_INGESTION_API_BASE_URL
Value: https://ingestion.tadfuq.com
Environments: ✅ Production ✅ Preview ✅ Development
```

5. **اضغط "Save"** لكل متغير

6. **Redeploy المشروع:**
   - **Deployments** → آخر deployment
   - **⋯** → **Redeploy**

---

## 📋 الطريقة 2: Vercel CLI (للمحترفين)

```bash
# 1. تثبيت Vercel CLI
npm i -g vercel

# 2. تسجيل الدخول
vercel login

# 3. ربط المشروع
cd /Users/adam/Desktop/tad/tadfuq-platform/frontend
vercel link

# 4. رفع Environment Variables من الملف
vercel env pull .env.local
vercel env add NEXTAUTH_URL production
# أدخل القيمة: https://tadfuq-platform.vercel.app

vercel env add NEXTAUTH_SECRET production
# أدخل القيمة: 4Mg7bRimgvt4wXDreQDPBIgAbeNA4GfufOWb91Dwcus=

# ... كرر لباقي المتغيرات

# 5. Redeploy
vercel --prod
```

---

## ✅ التحقق من النجاح

بعد الـ Redeploy:

1. افتح: `https://tadfuq-platform.vercel.app`
2. يجب أن يفتح الموقع **مباشرة بدون login**
3. لن يظهر Server Error
4. ستظهر بيانات تجريبية (mock data)

---

## 🔒 ملاحظات أمان

⚠️ **لا ترفع ملف `.env.vercel` على Git!**

الملف موجود بالفعل في `.gitignore` لكن تأكد:

```bash
# تحقق من .gitignore
cat .gitignore | grep env
```

يجب أن يحتوي على:
```
.env*.local
.env.vercel
```

---

## 📞 إذا واجهت مشكلة

### Server Error لا يزال موجود؟

1. تأكد من إضافة **جميع** المتغيرات
2. تأكد من عمل **Redeploy** بعد الإضافة
3. انتظر 2-3 دقائق للـ deployment
4. امسح cache المتصفح (Ctrl+Shift+R)

### المتغيرات مش شغالة؟

1. تحقق من الأسماء (case-sensitive)
2. تحقق من اختيار جميع Environments
3. شاهد Function Logs في Vercel

---

## 🎯 ملخص سريع

```
✅ ملف .env.vercel جاهز
✅ NEXTAUTH_SECRET تم توليده
✅ جميع المتغيرات موجودة
✅ جاهز للرفع على Vercel

الخطوة التالية:
1. افتح Vercel Dashboard
2. أضف المتغيرات من .env.vercel
3. Redeploy
4. استمتع! 🎉
```

---

**وقت التنفيذ:** 5-10 دقائق  
**آخر تحديث:** 4 مارس 2026
