# دليل نشر Frontend على AWS Amplify

## نظرة عامة

هذا الدليل يشرح كيفية نشر Next.js frontend على AWS Amplify مع ربطه بالـ backend API على `api.TadFuq.ai`.

---

## المتطلبات الأساسية

1. ✅ Backend منشور على AWS (api.TadFuq.ai)
2. ✅ حساب AWS مع صلاحيات Amplify
3. ✅ Git repository (GitHub, GitLab, أو Bitbucket)
4. ✅ Domain name (اختياري - للـ custom domain)

---

## الطريقة 1: النشر عبر AWS Console (موصى به)

### **الخطوة 1: إنشاء Amplify App**

1. اذهب إلى [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. اضغط **"New app"** → **"Host web app"**
3. اختر مصدر الكود:
   - GitHub
   - GitLab
   - Bitbucket
   - أو **Deploy without Git provider** (رفع يدوي)

### **الخطوة 2: ربط Repository**

إذا اخترت Git provider:

1. قم بتسجيل الدخول إلى GitHub/GitLab
2. اختر repository: `tadfuq-platform`
3. اختر branch: `main` أو `production`
4. اضغط **Next**

### **الخطوة 3: إعدادات Build**

Amplify سيكتشف Next.js تلقائياً. تأكد من الإعدادات:

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

**App build specification:**
- Build command: `npm run build`
- Build output directory: `.next`
- Root directory: `frontend`

### **الخطوة 4: إضافة Environment Variables**

في صفحة **Environment variables**، أضف:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://api.TadFuq.ai
NEXT_PUBLIC_TENANT_API_URL=https://api.TadFuq.ai/api/tenant
NEXT_PUBLIC_INGESTION_API_URL=https://api.TadFuq.ai/api/ingestion

# NextAuth
NEXTAUTH_URL=https://main.d1234567890.amplifyapp.com  # سيتم تحديثه بعد النشر
NEXTAUTH_SECRET=generate-a-secure-random-string-here

# App Info
NEXT_PUBLIC_APP_NAME=CashFlow.ai
NEXT_PUBLIC_APP_URL=https://app.TadFuq.ai
```

**لتوليد NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### **الخطوة 5: مراجعة والنشر**

1. راجع جميع الإعدادات
2. اضغط **Save and deploy**
3. انتظر حتى يكتمل Build (5-10 دقائق)

---

## الطريقة 2: النشر عبر AWS CLI

### **1. تثبيت AWS CLI**

```bash
# إذا لم يكن مثبتاً
brew install awscli

# تسجيل الدخول
aws configure
```

### **2. إنشاء Amplify App**

```bash
cd /Users/adam/Desktop/tad/tadfuq-platform

# إنشاء app
aws amplify create-app \
  --name cashflow-frontend \
  --repository https://github.com/your-username/tadfuq-platform \
  --platform WEB \
  --region me-south-1
```

### **3. إضافة Branch**

```bash
APP_ID="your-app-id-from-previous-command"

aws amplify create-branch \
  --app-id $APP_ID \
  --branch-name main \
  --region me-south-1
```

### **4. بدء Deployment**

```bash
aws amplify start-job \
  --app-id $APP_ID \
  --branch-name main \
  --job-type RELEASE \
  --region me-south-1
```

---

## إعداد Custom Domain

### **الخطوة 1: إضافة Domain في Amplify**

1. في Amplify Console، اذهب إلى **Domain management**
2. اضغط **Add domain**
3. أدخل domain: `TadFuq.ai`
4. اختر subdomain: `app` (سيصبح `app.TadFuq.ai`)

### **الخطوة 2: تحديث DNS في Route53**

Amplify سيعطيك CNAME records. أضفها في Route53:

```bash
# في Route53 hosted zone لـ TadFuq.ai
Name: app.TadFuq.ai
Type: CNAME
Value: <amplify-domain>.cloudfront.net
```

أو استخدم Terraform:

```hcl
# في infra/terraform/route53.tf
resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.existing[0].zone_id
  name    = "app.TadFuq.ai"
  type    = "CNAME"
  ttl     = 300
  records = ["<your-amplify-domain>.cloudfront.net"]
}
```

### **الخطوة 3: SSL Certificate**

Amplify سينشئ SSL certificate تلقائياً من ACM. انتظر حتى يكتمل (5-10 دقائق).

---

## تحديث CORS في Backend

بعد النشر، حدّث CORS settings في backend:

```go
// في backend Go code
AllowedOrigins: []string{
    "https://app.TadFuq.ai",
    "https://main.d1234567890.amplifyapp.com", // Amplify default domain
    "http://localhost:3000", // للتطوير المحلي
}
```

ثم أعد نشر backend services:

```bash
cd backend
docker buildx build --platform linux/amd64 -t cashflow/tenant-service:latest -f ../infra/docker/Dockerfile . --load
docker tag cashflow/tenant-service:latest 747253121951.dkr.ecr.me-south-1.amazonaws.com/cashflow/tenant-service:latest
docker push 747253121951.dkr.ecr.me-south-1.amazonaws.com/cashflow/tenant-service:latest

aws ecs update-service --cluster cashflow-dev-cluster --service cashflow-dev-tenant --force-new-deployment --region me-south-1
```

---

## التحقق من النشر

### **1. فحص Build Logs**

في Amplify Console:
1. اذهب إلى **Build history**
2. اضغط على آخر build
3. راجع logs للتأكد من عدم وجود أخطاء

### **2. اختبار التطبيق**

```bash
# افتح في المتصفح
https://main.d1234567890.amplifyapp.com

# أو custom domain
https://app.TadFuq.ai
```

### **3. فحص API Connectivity**

افتح Developer Console في المتصفح وتحقق من:
- ✅ API requests تذهب إلى `https://api.TadFuq.ai`
- ✅ لا توجد CORS errors
- ✅ Authentication يعمل

---

## Continuous Deployment

### **تفعيل Auto-Deploy**

Amplify سينشر تلقائياً عند كل push إلى branch:

1. في Amplify Console → **App settings** → **Build settings**
2. تأكد من تفعيل **Automatically build and deploy**
3. اختر branch للـ auto-deploy

### **Preview Deployments**

لإنشاء preview لكل Pull Request:

1. اذهب إلى **Previews**
2. فعّل **Pull request previews**
3. اختر branches

---

## Environment Variables Management

### **إضافة/تعديل Variables**

```bash
# عبر CLI
aws amplify update-app \
  --app-id $APP_ID \
  --environment-variables \
    NEXT_PUBLIC_API_URL=https://api.TadFuq.ai \
    NEXTAUTH_SECRET=your-secret \
  --region me-south-1
```

أو عبر Console:
1. **App settings** → **Environment variables**
2. اضغط **Manage variables**
3. أضف/عدّل/احذف

### **Variables للـ Branches المختلفة**

يمكنك تعيين variables مختلفة لكل branch:

- `main` → Production variables
- `dev` → Development variables
- `staging` → Staging variables

---

## Performance Optimization

### **1. تفعيل SSR Caching**

في `next.config.js`:

```javascript
module.exports = {
  experimental: {
    isrMemoryCacheSize: 0, // Disable ISR cache in Amplify
  },
}
```

### **2. Image Optimization**

Amplify يدعم Next.js Image Optimization تلقائياً.

### **3. Custom Headers**

في Amplify Console → **Rewrites and redirects**:

```json
[
  {
    "source": "/<*>",
    "target": "/index.html",
    "status": "200",
    "condition": null
  },
  {
    "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json)$)([^.]+$)/>",
    "target": "/index.html",
    "status": "200",
    "condition": null
  }
]
```

---

## Monitoring & Logs

### **CloudWatch Logs**

Amplify يرسل logs إلى CloudWatch:

```bash
# عرض logs
aws logs tail /aws/amplify/cashflow-frontend \
  --since 1h \
  --region me-south-1 \
  --follow
```

### **Metrics**

في Amplify Console → **Monitoring**:
- Request count
- Data transfer
- Error rate
- Build duration

---

## استكشاف الأخطاء

### **Build Failures**

**المشكلة:** Build يفشل مع `npm ci` error

**الحل:**
```bash
# تأكد من package-lock.json موجود في Git
git add frontend/package-lock.json
git commit -m "Add package-lock.json"
git push
```

### **Environment Variables لا تعمل**

**المشكلة:** Variables غير متاحة في runtime

**الحل:**
- تأكد من أن variables تبدأ بـ `NEXT_PUBLIC_` للـ client-side
- أعد build التطبيق بعد تغيير variables

### **CORS Errors**

**المشكلة:** API requests محظورة

**الحل:**
```go
// في backend
AllowedOrigins: []string{
    "https://app.TadFuq.ai",
    "https://*.amplifyapp.com",
}
```

### **404 on Page Refresh**

**المشكلة:** صفحة 404 عند refresh

**الحل:**
أضف rewrite rule في Amplify:
```json
{
  "source": "/<*>",
  "target": "/index.html",
  "status": "200"
}
```

---

## التكلفة

### **AWS Amplify Pricing**

**Build Minutes:**
- أول 1000 دقيقة/شهر: مجاني
- بعد ذلك: $0.01/دقيقة

**Hosting:**
- أول 15 GB storage: مجاني
- أول 5 GB data transfer: مجاني
- بعد ذلك: $0.15/GB storage, $0.15/GB transfer

**التكلفة المتوقعة:**
- **Dev/Staging:** ~$0-5/شهر
- **Production:** ~$10-20/شهر

---

## الخلاصة

بعد إتمام هذه الخطوات، سيكون لديك:

✅ Frontend منشور على AWS Amplify  
✅ Custom domain (`app.TadFuq.ai`)  
✅ SSL certificate تلقائي  
✅ Continuous deployment من Git  
✅ Environment variables مُهيأة  
✅ متصل بـ backend API  

**Next Steps:**
- إعداد Keycloak authentication
- تفعيل monitoring و alerts
- إضافة custom error pages
