# دليل النشر على AWS - CashFlow.ai

## نظرة عامة

هذا الدليل يشرح كيفية نشر منصة CashFlow.ai على AWS باستخدام:
- **ECS Fargate** - لتشغيل الخدمات بدون إدارة السيرفرات
- **RDS PostgreSQL** - قاعدة بيانات مُدارة
- **Application Load Balancer** - توزيع الحمل
- **VPC** - شبكة افتراضية معزولة
- **ECR** - تخزين صور Docker

## البنية التحتية

### المكونات الرئيسية

```
┌─────────────────────────────────────────────────────────┐
│                    Internet Gateway                      │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────▼──────────────┐
         │  Application Load Balancer │
         │  (Public Subnets)          │
         └───────────┬────────────────┘
                     │
         ┌───────────▼──────────────┐
         │   ECS Fargate Cluster     │
         │   (Private Subnets)       │
         │                           │
         │  ┌─────────────────────┐  │
         │  │ Tenant Service      │  │
         │  │ Port: 8080          │  │
         │  └─────────────────────┘  │
         │                           │
         │  ┌─────────────────────┐  │
         │  │ Ingestion Service   │  │
         │  │ Port: 8081          │  │
         │  └─────────────────────┘  │
         └───────────┬───────────────┘
                     │
         ┌───────────▼──────────────┐
         │   RDS PostgreSQL 16       │
         │   (Private Subnets)       │
         └───────────────────────────┘
```

### المنطقة الجغرافية

- **المنطقة الافتراضية**: `me-south-1` (البحرين)
- **الأقرب لـ**: السعودية، قطر، الإمارات، الكويت، عمان

## المتطلبات الأساسية

### 1. الأدوات المطلوبة

```bash
# AWS CLI
brew install awscli

# Terraform
brew install terraform

# Docker
brew install --cask docker

# golang-migrate (اختياري للـ migrations)
brew install golang-migrate
```

### 2. إعداد AWS CLI

```bash
# تكوين AWS credentials
aws configure

# أدخل:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: me-south-1
# - Default output format: json
```

### 3. التحقق من الصلاحيات

تأكد أن حسابك في AWS لديه الصلاحيات التالية:
- EC2 (VPC, Subnets, Security Groups)
- ECS (Cluster, Services, Tasks)
- RDS (Database instances)
- ECR (Repositories)
- IAM (Roles, Policies)
- Secrets Manager
- CloudWatch Logs

## خطوات النشر

### الطريقة 1: النشر التلقائي (موصى به)

```bash
# من جذر المشروع
cd /Users/adam/Desktop/tad/tadfuq-platform

# تشغيل سكريبت النشر
./infra/scripts/deploy.sh
```

السكريبت سيقوم بـ:
1. ✅ التحقق من الأدوات المطلوبة
2. ✅ إنشاء البنية التحتية عبر Terraform
3. ✅ بناء ورفع صور Docker إلى ECR
4. ✅ تشغيل migrations على قاعدة البيانات
5. ✅ تحديث خدمات ECS
6. ✅ عرض معلومات النشر

### الطريقة 2: النشر اليدوي خطوة بخطوة

#### الخطوة 1: إنشاء البنية التحتية

```bash
cd infra/terraform

# نسخ ملف المتغيرات
cp terraform.tfvars.example terraform.tfvars

# تعديل المتغيرات حسب الحاجة
nano terraform.tfvars

# تهيئة Terraform
terraform init

# مراجعة التغييرات
terraform plan

# تطبيق البنية التحتية
terraform apply
```

**الوقت المتوقع**: 10-15 دقيقة (RDS يأخذ معظم الوقت)

#### الخطوة 2: بناء ورفع صور Docker

```bash
# الحصول على معلومات الحساب
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="me-south-1"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# تسجيل الدخول إلى ECR
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin $ECR_REGISTRY

# بناء tenant-service
cd backend
docker build -t cashflow/tenant-service:latest -f ../infra/docker/Dockerfile .
docker tag cashflow/tenant-service:latest \
    ${ECR_REGISTRY}/cashflow/tenant-service:latest
docker push ${ECR_REGISTRY}/cashflow/tenant-service:latest

# بناء ingestion-service
docker build -t cashflow/ingestion-service:latest -f ../infra/docker/Dockerfile.ingestion .
docker tag cashflow/ingestion-service:latest \
    ${ECR_REGISTRY}/cashflow/ingestion-service:latest
docker push ${ECR_REGISTRY}/cashflow/ingestion-service:latest
```

#### الخطوة 3: تشغيل Database Migrations

```bash
cd backend

# الحصول على معلومات قاعدة البيانات من Terraform
cd ../infra/terraform
DB_ENDPOINT=$(terraform output -raw db_endpoint)
DB_PASSWORD_ARN=$(terraform output -raw db_password_secret_arn)

# الحصول على كلمة المرور من Secrets Manager
DB_PASSWORD=$(aws secretsmanager get-secret-value \
    --secret-id "$DB_PASSWORD_ARN" \
    --query SecretString --output text | jq -r '.password')

# تشغيل migrations
cd ../../backend
migrate -path migrations \
    -database "postgres://cashflow:${DB_PASSWORD}@${DB_ENDPOINT}/cashflow?sslmode=require" up
```

#### الخطوة 4: تحديث خدمات ECS

```bash
cd ../infra/terraform
CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)

# إعادة نشر الخدمات
aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service cashflow-dev-tenant \
    --force-new-deployment \
    --region me-south-1

aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service cashflow-dev-ingestion \
    --force-new-deployment \
    --region me-south-1
```

## التحقق من النشر

### 1. فحص صحة الخدمات

```bash
# الحصول على رابط Load Balancer
cd infra/terraform
ALB_URL=$(terraform output -raw alb_url)

# فحص tenant-service
curl $ALB_URL/healthz

# فحص ingestion-service  
curl $ALB_URL/api/ingestion/healthz
```

### 2. مراقبة ECS Tasks

```bash
# عرض حالة الخدمات
aws ecs list-services --cluster cashflow-dev-cluster --region me-south-1

# عرض تفاصيل المهام
aws ecs list-tasks --cluster cashflow-dev-cluster --region me-south-1
```

### 3. مراجعة Logs

```bash
# عرض logs من CloudWatch
aws logs tail /ecs/cashflow-dev --follow --region me-south-1
```

## التكاليف المتوقعة (شهرياً)

### بيئة Dev/Staging

| المورد | المواصفات | التكلفة التقريبية (USD) |
|--------|-----------|------------------------|
| **RDS PostgreSQL** | db.t4g.micro, 20GB | ~$15 |
| **ECS Fargate** | 2 tasks × 0.5 vCPU, 1GB | ~$20 |
| **ALB** | Application Load Balancer | ~$20 |
| **NAT Gateway** | 1 NAT Gateway | ~$35 |
| **Data Transfer** | تقديري | ~$10 |
| **CloudWatch Logs** | 7 days retention | ~$5 |
| **إجمالي** | | **~$105/شهر** |

### تقليل التكاليف

```bash
# إيقاف البيئة عند عدم الاستخدام
terraform destroy

# أو تقليل عدد المهام
aws ecs update-service \
    --cluster cashflow-dev-cluster \
    --service cashflow-dev-tenant \
    --desired-count 0
```

## استكشاف الأخطاء

### المشكلة: ECS Tasks تفشل في البدء

```bash
# فحص أسباب الفشل
aws ecs describe-tasks \
    --cluster cashflow-dev-cluster \
    --tasks <task-id> \
    --region me-south-1
```

**الحلول الشائعة**:
- تأكد من صحة environment variables
- تحقق من Security Groups
- راجع CloudWatch Logs

### المشكلة: لا يمكن الوصول للـ ALB

```bash
# فحص Security Group
aws ec2 describe-security-groups \
    --filters "Name=tag:Name,Values=cashflow-dev-alb-sg" \
    --region me-south-1
```

**الحل**: تأكد من فتح المنافذ 80 و 443

### المشكلة: Database connection timeout

```bash
# فحص RDS Security Group
aws ec2 describe-security-groups \
    --filters "Name=tag:Name,Values=cashflow-dev-rds-sg" \
    --region me-south-1
```

**الحل**: تأكد من السماح للـ ECS tasks بالوصول للمنفذ 5432

## التحديثات والصيانة

### تحديث الكود

```bash
# بناء ورفع صور جديدة
./infra/scripts/deploy.sh --skip-terraform

# أو يدوياً
cd backend
docker build -t cashflow/tenant-service:latest -f ../infra/docker/Dockerfile .
# ... رفع الصورة
aws ecs update-service --cluster cashflow-dev-cluster \
    --service cashflow-dev-tenant --force-new-deployment
```

### تحديث البنية التحتية

```bash
cd infra/terraform

# تعديل الملفات
nano variables.tf

# تطبيق التغييرات
terraform plan
terraform apply
```

### Rollback

```bash
# العودة لإصدار سابق من الصورة
aws ecs update-service \
    --cluster cashflow-dev-cluster \
    --service cashflow-dev-tenant \
    --task-definition cashflow-dev-tenant:PREVIOUS_VERSION
```

## الأمان

### Best Practices المطبقة

✅ **Network Isolation**: الخدمات في Private Subnets  
✅ **Encryption**: RDS encrypted at rest  
✅ **Secrets Management**: كلمات المرور في Secrets Manager  
✅ **Security Groups**: قواعد صارمة للوصول  
✅ **IAM Roles**: صلاحيات محدودة لكل خدمة  
✅ **CloudWatch**: مراقبة ولوقات مركزية  

### توصيات إضافية للإنتاج

- [ ] تفعيل HTTPS على ALB (ACM Certificate)
- [ ] تفعيل WAF على ALB
- [ ] Multi-AZ deployment للـ RDS
- [ ] Auto-scaling للـ ECS tasks
- [ ] Backup automation للـ RDS
- [ ] CloudTrail للتدقيق
- [ ] GuardDuty للكشف عن التهديدات

## الخطوات التالية

1. **إعداد Domain Name**: ربط domain مع ALB
2. **SSL/TLS**: إضافة شهادة SSL من ACM
3. **CI/CD**: إعداد GitHub Actions للنشر التلقائي
4. **Monitoring**: إعداد CloudWatch Dashboards
5. **Alerting**: إعداد SNS notifications
6. **Frontend**: نشر Next.js على Vercel أو Amplify

## الدعم

للمساعدة أو الاستفسارات:
- راجع [AWS Documentation](https://docs.aws.amazon.com/)
- راجع [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- افتح issue في المشروع
