# Tadfuq Platform - AWS Amplify Deployment Guide

## 🚀 Deploy to AWS Amplify Hosting

AWS Amplify Hosting هو أفضل خيار لرفع تطبيقات Next.js على AWS - سريع، سهل، ومجاني للبداية.

---

## 📋 المتطلبات

- ✅ حساب AWS (مجاني)
- ✅ Git repository (GitHub/GitLab/Bitbucket)
- ✅ المشروع جاهز للـ build

---

## 🎯 الطريقة 1: AWS Amplify Console (الأسهل)

### **الخطوة 1: تسجيل الدخول**
1. اذهب إلى: https://console.aws.amazon.com/amplify
2. سجل دخول بحساب AWS الخاص بك
3. اختر المنطقة (Region): **US East (N. Virginia)** أو الأقرب لك

### **الخطوة 2: إنشاء تطبيق جديد**
1. اضغط **"New app"** → **"Host web app"**
2. اختر مصدر الكود:
   - **GitHub** (موصى به)
   - GitLab
   - Bitbucket
   - أو ارفع الكود مباشرة

### **الخطوة 3: ربط Repository**
1. اختر **GitHub**
2. سجل دخول GitHub
3. اختر repository: `tadfuq-platform`
4. اختر branch: `main` أو `refactor/monorepo-structure`

### **الخطوة 4: إعدادات Build**
AWS Amplify سيكتشف Next.js تلقائياً، لكن تأكد من:

**App name:** `tadfuq-platform`

**Monorepo settings:**
- Root directory: `frontend`
- Build settings: سيستخدم `amplify.yml` تلقائياً

**Environment variables (اختياري):**
```
NEXT_PUBLIC_API_URL=https://api.tadfuq.com
NODE_ENV=production
```

### **الخطوة 5: مراجعة والنشر**
1. راجع الإعدادات
2. اضغط **"Save and deploy"**
3. انتظر 5-10 دقائق للـ build الأول

---

## 🌐 رابط التطبيق

بعد الـ deployment الناجح، ستحصل على:
- **Production URL:** `https://main.xxxxxx.amplifyapp.com`
- **Custom domain:** يمكنك إضافة domain خاص بك لاحقاً

---

## 🔧 الطريقة 2: AWS Amplify CLI

### **التثبيت والإعداد**
```bash
# 1. تثبيت Amplify CLI
npm install -g @aws-amplify/cli

# 2. إعداد AWS credentials
amplify configure

# 3. الانتقال لمجلد المشروع
cd /Users/adam/Desktop/tad/tadfuq-platform/frontend

# 4. تهيئة Amplify
amplify init

# 5. إضافة hosting
amplify add hosting

# 6. اختر: Hosting with Amplify Console (Managed hosting with custom domains, Continuous deployment)

# 7. نشر المشروع
amplify publish
```

---

## ⚙️ Build Settings (amplify.yml)

الملف `amplify.yml` موجود بالفعل في المشروع:

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
      - .next/cache/**/*
```

---

## 🔄 Continuous Deployment

بعد الربط مع Git:
- **Push to main** → Automatic production deployment
- **Pull requests** → Preview deployments
- **Branch deploys** → Test different features

---

## 🌍 Custom Domain

### **إضافة Domain خاص**
1. في Amplify Console → اختر التطبيق
2. اذهب إلى **"Domain management"**
3. اضغط **"Add domain"**
4. أدخل domain الخاص بك (مثل: `tadfuq.com`)
5. اتبع التعليمات لإعداد DNS records

**DNS Records:**
```
Type: CNAME
Name: www
Value: [provided by Amplify]

Type: A
Name: @
Value: [provided by Amplify]
```

---

## 📊 Monitoring & Analytics

AWS Amplify يوفر:
- **Build logs** - سجلات الـ build الكاملة
- **Access logs** - سجلات الزوار
- **Performance metrics** - مقاييس الأداء
- **Error tracking** - تتبع الأخطاء

---

## 💰 التكلفة

**AWS Free Tier:**
- 1000 build minutes/شهر
- 15 GB data transfer/شهر
- 5 GB storage
- **مجاني للسنة الأولى!**

**بعد Free Tier:**
- Build minutes: $0.01/دقيقة
- Data transfer: $0.15/GB
- Storage: $0.023/GB/شهر

**تقدير للمشروع:**
- Build time: ~3-5 دقائق
- Monthly cost: **$0-5** (حسب الاستخدام)

---

## 🔒 Security Features

- ✅ **HTTPS تلقائي** - SSL certificates مجاناً
- ✅ **DDoS protection** - حماية من الهجمات
- ✅ **WAF integration** - Web Application Firewall
- ✅ **Password protection** - حماية بكلمة مرور للـ preview branches

---

## 🚀 Performance

- ✅ **Global CDN** - CloudFront distribution
- ✅ **Edge caching** - تخزين مؤقت عالمي
- ✅ **Instant cache invalidation** - تحديث فوري
- ✅ **Atomic deployments** - نشر آمن بدون downtime

---

## 🐛 Troubleshooting

### Build فشل؟
```bash
# تحقق من logs في Amplify Console
# أو جرب build محلياً:
npm run build
```

### Environment variables مش شغالة؟
- تأكد من إضافتها في Amplify Console → Environment variables
- Variables بتبدأ بـ `NEXT_PUBLIC_` للـ client-side

### Monorepo مش بيشتغل؟
- تأكد من Root directory: `frontend`
- تأكد من وجود `amplify.yml` في مجلد frontend

---

## 📚 مقارنة مع Vercel

| Feature | AWS Amplify | Vercel |
|---------|-------------|--------|
| **السعر** | Free tier سخي | Free tier محدود |
| **Performance** | CloudFront CDN | Edge Network |
| **Setup** | متوسط | سهل جداً |
| **AWS Integration** | ممتاز | محدود |
| **Next.js Support** | جيد | ممتاز (مطور Next.js) |
| **Custom Domain** | مجاني | مجاني |
| **Build Time** | 3-5 دقائق | 2-3 دقائق |

**التوصية:**
- **Vercel:** إذا كنت تريد أسهل وأسرع deployment
- **AWS Amplify:** إذا كنت تستخدم AWS services أخرى

---

## 📞 الدعم

- **AWS Documentation:** https://docs.aws.amazon.com/amplify
- **AWS Support:** https://console.aws.amazon.com/support
- **Community:** https://github.com/aws-amplify/amplify-hosting

---

## ✅ Deployment Checklist

قبل الـ deployment:
- ✅ `npm run build` يعمل محلياً
- ✅ `amplify.yml` موجود في frontend/
- ✅ Environment variables محددة
- ✅ Git repository متصل
- ✅ AWS account جاهز

---

## 🎯 الخطوات السريعة

```bash
# 1. Push الكود على GitHub (تم ✅)
git push origin main

# 2. اذهب إلى AWS Amplify Console
https://console.aws.amazon.com/amplify

# 3. New app → Host web app → GitHub

# 4. اختر repository: tadfuq-platform

# 5. Root directory: frontend

# 6. Save and deploy!
```

---

**جاهز للنشر؟ اتبع الخطوات أعلاه!** 🚀

---

## 🔗 روابط مفيدة

- **AWS Amplify Console:** https://console.aws.amazon.com/amplify
- **Amplify Docs:** https://docs.amplify.aws
- **Next.js on Amplify:** https://docs.amplify.aws/guides/hosting/nextjs
- **Pricing Calculator:** https://calculator.aws

---

**Last Updated:** March 4, 2026  
**Version:** 1.0
