# ✅ تم التحويل من ECS إلى EKS

## 📋 التغييرات الرئيسية

### **1. المنطقة (Region)**
- ❌ القديم: `me-south-1` (البحرين)
- ✅ الجديد: `us-east-1` (فيرجينيا)

### **2. Container Orchestration**
- ❌ القديم: **ECS Fargate**
- ✅ الجديد: **EKS (Kubernetes)**

---

## 🗂️ الملفات الجديدة

### **Terraform Files**
```
infra/terraform/
├── eks.tf                    # EKS cluster + node group
├── alb-controller.tf         # AWS Load Balancer Controller IAM
├── security_groups_eks.tf    # Security groups for EKS
├── ecr.tf                    # ECR repositories
└── variables.tf              # Updated with EKS variables
```

### **Kubernetes Manifests**
```
infra/k8s/
├── namespace.yaml            # cashflow-dev namespace
├── tenant-service.yaml       # Tenant service deployment + service
├── ingestion-service.yaml    # Ingestion service deployment + service
└── ingress.yaml              # ALB Ingress for routing
```

### **Deployment Scripts**
```
infra/scripts/
└── deploy-eks.sh             # Complete EKS deployment script
```

---

## 🏗️ البنية الجديدة

### **EKS Cluster**
- **Cluster Name:** `cashflow-dev-cluster`
- **Kubernetes Version:** 1.28
- **Node Group:**
  - Instance Type: `t3.medium`
  - Min Nodes: 1
  - Desired Nodes: 2
  - Max Nodes: 4

### **Add-ons**
- ✅ VPC CNI
- ✅ CoreDNS
- ✅ kube-proxy
- ✅ EBS CSI Driver
- ✅ AWS Load Balancer Controller

### **Services**
- **Tenant Service:** 2 replicas, port 8080
- **Ingestion Service:** 2 replicas, port 8081

### **Networking**
- **VPC CIDR:** 10.0.0.0/16
- **Availability Zones:** us-east-1a, us-east-1b
- **Load Balancer:** Application Load Balancer (via Ingress)

---

## 🚀 كيفية النشر

### **الطريقة 1: Script آلي (موصى به)**

```bash
cd infra/scripts
./deploy-eks.sh
```

هذا Script سيقوم بـ:
1. ✅ تطبيق Terraform configuration
2. ✅ تكوين kubectl
3. ✅ تثبيت AWS Load Balancer Controller
4. ✅ بناء ورفع Docker images
5. ✅ إنشاء database secrets
6. ✅ نشر Kubernetes manifests
7. ✅ الانتظار حتى تصبح Services جاهزة

---

### **الطريقة 2: خطوات يدوية**

#### **1. تطبيق Terraform**
```bash
cd infra/terraform
terraform init
terraform apply
```

#### **2. تكوين kubectl**
```bash
aws eks update-kubeconfig --name cashflow-dev-cluster --region us-east-1
```

#### **3. تثبيت AWS Load Balancer Controller**
```bash
# Create service account
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: aws-load-balancer-controller
  namespace: kube-system
  annotations:
    eks.amazonaws.com/role-arn: $(terraform output -raw alb_controller_role_arn)
EOF

# Install via Helm
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=cashflow-dev-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set region=us-east-1 \
  --set vpcId=$(terraform output -raw vpc_id)
```

#### **4. بناء ورفع Docker Images**
```bash
# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

# Build and push
cd backend
docker build -t ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/cashflow/tenant-service:latest \
  -f cmd/tenant-service/Dockerfile .
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/cashflow/tenant-service:latest

docker build -t ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/cashflow/ingestion-service:latest \
  -f cmd/ingestion-service/Dockerfile .
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/cashflow/ingestion-service:latest
```

#### **5. إنشاء Database Secret**
```bash
kubectl create namespace cashflow-dev

DB_HOST=$(cd infra/terraform && terraform output -raw db_endpoint | cut -d: -f1)
DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id $(cd infra/terraform && terraform output -raw db_password_secret_arn) \
  --query SecretString --output text | jq -r .password)

kubectl create secret generic db-credentials \
  --from-literal=host=${DB_HOST} \
  --from-literal=password=${DB_PASSWORD} \
  --namespace=cashflow-dev
```

#### **6. نشر Kubernetes Manifests**
```bash
cd infra/k8s

# Replace AWS_ACCOUNT_ID in files
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
for file in *.yaml; do
  sed "s/\${AWS_ACCOUNT_ID}/${AWS_ACCOUNT_ID}/g" $file | kubectl apply -f -
done
```

---

## 🔍 التحقق من النشر

### **Check Pods**
```bash
kubectl get pods -n cashflow-dev
```

### **Check Services**
```bash
kubectl get svc -n cashflow-dev
```

### **Check Ingress**
```bash
kubectl get ingress -n cashflow-dev
```

### **Get ALB URL**
```bash
kubectl get ingress cashflow-ingress -n cashflow-dev \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

### **Check Logs**
```bash
kubectl logs -f deployment/tenant-service -n cashflow-dev
kubectl logs -f deployment/ingestion-service -n cashflow-dev
```

---

## 📊 الموارد المنشورة

### **AWS Resources**
- ✅ EKS Cluster (1.28)
- ✅ EKS Node Group (2 nodes, t3.medium)
- ✅ VPC + Subnets (Public & Private)
- ✅ Security Groups
- ✅ RDS PostgreSQL
- ✅ ECR Repositories
- ✅ IAM Roles & Policies
- ✅ Application Load Balancer (via Ingress)
- ✅ Route53 (if domain configured)

### **Kubernetes Resources**
- ✅ Namespace: cashflow-dev
- ✅ Deployments: tenant-service, ingestion-service
- ✅ Services: tenant-service, ingestion-service
- ✅ Ingress: cashflow-ingress
- ✅ Secret: db-credentials

---

## 💰 التكلفة المتوقعة (us-east-1)

### **شهرياً (تقريبي)**
- EKS Cluster: $73/شهر
- EC2 Nodes (2x t3.medium): ~$60/شهر
- RDS (db.t4g.micro): ~$15/شهر
- ALB: ~$20/شهر
- Data Transfer: ~$10/شهر
- **المجموع: ~$178/شهر**

*(أرخص من me-south-1 بحوالي 20%)*

---

## 🎯 الخطوات التالية

1. ✅ تشغيل `./deploy-eks.sh`
2. ⏳ انتظر 10-15 دقيقة للنشر الكامل
3. ✅ احصل على ALB URL
4. ✅ اختبر APIs
5. ✅ (اختياري) ربط Domain Name

---

## 📝 ملاحظات مهمة

### **الفروقات عن ECS**
- ✅ **Kubernetes:** تحكم أكبر، portable
- ✅ **Scaling:** Auto-scaling أفضل
- ✅ **Monitoring:** Kubernetes-native tools
- ⚠️ **Complexity:** يحتاج معرفة بـ Kubernetes

### **Prerequisites**
- AWS CLI configured
- kubectl installed
- Helm installed
- Docker installed
- jq installed

---

**جاهز للنشر!** 🚀

قم بتشغيل:
```bash
cd infra/scripts
./deploy-eks.sh
```
