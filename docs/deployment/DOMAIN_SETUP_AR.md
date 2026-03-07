# دليل إعداد Domain Name و SSL على AWS

## نظرة عامة

هذا الدليل يشرح كيفية ربط domain name مخصص بالـ Application Load Balancer وإضافة SSL certificate للحصول على HTTPS.

---

## المتطلبات الأساسية

1. **Domain Name مسجل** - يمكنك شراء domain من:
   - AWS Route53
   - GoDaddy
   - Namecheap
   - أي مزود آخر

2. **إمكانية الوصول إلى DNS Settings** للـ domain

3. **AWS Account** مع الصلاحيات المناسبة

---

## السيناريوهات المدعومة

### السيناريو 1: Domain مُدار بالكامل في AWS Route53

إذا كنت تريد AWS تدير DNS بالكامل:

```hcl
# في ملف terraform.tfvars
domain_name          = "api.cashflow.sa"
create_hosted_zone   = true
create_api_subdomain = true
```

**الخطوات:**
1. قم بتحديث `terraform.tfvars` بالقيم أعلاه
2. نفذ `terraform apply`
3. انسخ الـ nameservers من output
4. قم بتحديث nameservers عند مزود الـ domain الخاص بك

### السيناريو 2: Domain مُدار خارج AWS

إذا كنت تريد الاحتفاظ بـ DNS عند المزود الحالي:

```hcl
# في ملف terraform.tfvars
domain_name          = "api.cashflow.sa"
create_hosted_zone   = false
create_api_subdomain = false
```

**الخطوات:**
1. قم بتحديث `terraform.tfvars` بالقيم أعلاه
2. نفذ `terraform apply`
3. سيتم إنشاء SSL certificate فقط
4. **يجب عليك يدوياً:**
   - إضافة CNAME records للـ certificate validation
   - إضافة A/CNAME record يشير إلى ALB DNS name

---

## خطوات الإعداد التفصيلية

### 1. تحديث Terraform Configuration

```bash
cd infra/terraform

# انسخ ملف المثال إذا لم تفعل بعد
cp terraform.tfvars.example terraform.tfvars

# عدّل الملف
nano terraform.tfvars
```

أضف/عدّل السطور التالية:

```hcl
# Domain Configuration
domain_name          = "api.cashflow.sa"  # استبدل بـ domain الخاص بك
create_hosted_zone   = true               # true إذا تريد AWS يدير DNS
create_api_subdomain = true               # اختياري: إنشاء api.yourdomain.com
```

### 2. تطبيق التغييرات

```bash
# معاينة التغييرات
terraform plan

# تطبيق التغييرات
terraform apply
```

**ملاحظة:** إنشاء SSL certificate وvalidation قد يستغرق 5-30 دقيقة.

### 3. الحصول على Nameservers (إذا create_hosted_zone = true)

```bash
# احصل على nameservers
terraform output nameservers
```

ستحصل على شيء مثل:
```
[
  "ns-123.awsdns-12.com",
  "ns-456.awsdns-45.net",
  "ns-789.awsdns-78.org",
  "ns-012.awsdns-01.co.uk"
]
```

### 4. تحديث Nameservers عند مزود الـ Domain

اذهب إلى لوحة تحكم مزود الـ domain (مثل GoDaddy, Namecheap) وقم بتحديث nameservers إلى القيم من الخطوة السابقة.

**مثال في GoDaddy:**
1. سجل دخول إلى GoDaddy
2. اذهب إلى "My Products" → "Domains"
3. اضغط على "DNS" بجانب domain الخاص بك
4. اضغط "Change" بجانب Nameservers
5. اختر "Custom" وأدخل الـ nameservers من AWS
6. احفظ التغييرات

**⏱️ وقت الانتشار:** قد يستغرق 24-48 ساعة حتى تنتشر تغييرات DNS عالمياً.

---

## التحقق من الإعداد

### 1. التحقق من DNS Propagation

```bash
# تحقق من أن domain يشير إلى ALB
dig api.cashflow.sa

# أو استخدم nslookup
nslookup api.cashflow.sa
```

### 2. التحقق من SSL Certificate

```bash
# تحقق من حالة certificate
aws acm describe-certificate \
  --certificate-arn $(terraform output -raw certificate_arn) \
  --region me-south-1
```

يجب أن يكون `Status: "ISSUED"`

### 3. اختبار HTTPS

```bash
# اختبر الاتصال
curl https://api.cashflow.sa

# اختبر API endpoints
curl https://api.cashflow.sa/api/tenant/healthz
curl https://api.cashflow.sa/api/ingestion/healthz
```

---

## إعداد يدوي للـ Certificate Validation (إذا create_hosted_zone = false)

إذا كنت لا تستخدم Route53 لإدارة DNS، يجب عليك يدوياً إضافة CNAME records للـ validation:

### 1. احصل على validation records

```bash
# احصل على certificate ARN
terraform output certificate_arn

# احصل على validation records
aws acm describe-certificate \
  --certificate-arn <CERTIFICATE_ARN> \
  --region me-south-1 \
  --query 'Certificate.DomainValidationOptions[*].[ResourceRecord.Name,ResourceRecord.Value]' \
  --output table
```

### 2. أضف CNAME records عند مزود DNS

في لوحة تحكم مزود DNS الخاص بك، أضف CNAME record:

```
Name:  _abc123.api.cashflow.sa
Value: _xyz456.acm-validations.aws.
TTL:   300
```

**ملاحظة:** قد تحتاج لإضافة record واحد أو أكثر حسب عدد domains/subdomains.

### 3. أضف A/CNAME record للـ domain

```bash
# احصل على ALB DNS name
terraform output alb_dns_name
```

أضف record في DNS:

**خيار A - CNAME (مفضل):**
```
Name:  api.cashflow.sa
Type:  CNAME
Value: cashflow-dev-alb-1234567890.me-south-1.elb.amazonaws.com
TTL:   300
```

**خيار B - A Record (إذا كان CNAME غير مدعوم):**
```
Name:  api.cashflow.sa
Type:  A
Value: <IP address من ALB>
TTL:   300
```

---

## استكشاف الأخطاء

### المشكلة: Certificate validation عالق في "Pending Validation"

**الحل:**
1. تحقق من أن CNAME records تم إضافتها بشكل صحيح
2. انتظر حتى 30 دقيقة للـ DNS propagation
3. تحقق من DNS records:
   ```bash
   dig _abc123.api.cashflow.sa CNAME
   ```

### المشكلة: Domain لا يحل إلى ALB

**الحل:**
1. تحقق من nameservers:
   ```bash
   dig api.cashflow.sa NS
   ```
2. تأكد من أن nameservers تطابق AWS Route53 nameservers
3. انتظر حتى 48 ساعة للـ DNS propagation الكامل

### المشكلة: HTTPS لا يعمل

**الحل:**
1. تحقق من أن certificate تم إصداره:
   ```bash
   aws acm list-certificates --region me-south-1
   ```
2. تحقق من أن ALB listener على port 443 موجود:
   ```bash
   aws elbv2 describe-listeners \
     --load-balancer-arn $(terraform output -raw alb_arn) \
     --region me-south-1
   ```
3. تحقق من security group يسمح بـ port 443

### المشكلة: "NET::ERR_CERT_COMMON_NAME_INVALID"

**الحل:**
- تأكد من أن domain name في المتصفح يطابق domain في certificate
- تحقق من أن certificate يغطي subdomain (wildcard)

---

## الأمان والـ Best Practices

### 1. استخدم HTTPS فقط

بعد إعداد domain، قم بتفعيل redirect من HTTP إلى HTTPS (مُفعّل تلقائياً في Terraform).

### 2. استخدم TLS 1.3

SSL policy المستخدم: `ELBSecurityPolicy-TLS13-1-2-2021-06`

### 3. قم بتجديد Certificate تلقائياً

ACM certificates تتجدد تلقائياً طالما validation records موجودة.

### 4. استخدم HSTS Headers

أضف HSTS header في application code:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## إضافة Subdomains إضافية

لإضافة subdomain جديد (مثل `app.cashflow.sa`):

### 1. أضف إلى certificate

```hcl
# في route53.tf
subject_alternative_names = [
  "*.${var.domain_name}",  # Wildcard يغطي جميع subdomains
]
```

### 2. أضف Route53 record

```hcl
resource "aws_route53_record" "app" {
  count   = var.domain_name != "" && var.create_hosted_zone ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
```

---

## التكلفة

### Route53
- **Hosted Zone:** $0.50/شهر
- **DNS Queries:** $0.40 لكل مليون query (أول مليار query)

### ACM Certificate
- **مجاني!** ✅ لا توجد تكلفة للـ SSL certificates من ACM

### إجمالي التكلفة الإضافية
- **~$0.50-1/شهر** (فقط Route53 hosted zone)

---

## الخلاصة

بعد إتمام هذه الخطوات، سيكون لديك:

✅ Domain name مخصص يشير إلى ALB  
✅ SSL certificate صالح (HTTPS)  
✅ Automatic redirect من HTTP إلى HTTPS  
✅ DNS مُدار في Route53 (اختياري)  
✅ Wildcard certificate لجميع subdomains  

**Next Steps:**
- قم بتحديث frontend configuration لاستخدام domain الجديد
- قم بتحديث CORS settings لقبول domain الجديد
- قم بتحديث Keycloak redirect URIs
