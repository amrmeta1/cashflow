# 🚀 Production-Ready: ArgoCD + Helm + Cognito

## 🎯 البنية الكاملة

```
GitHub Repository
    ↓
ArgoCD (GitOps)
    ↓
Helm Charts
    ↓
EKS Cluster
    ├── Frontend (Next.js)
    ├── Tenant Service (Go)
    └── Ingestion Service (Go)
    ↓
AWS Cognito (Authentication)
    ↓
RDS PostgreSQL
```

---

## ✨ المميزات الجديدة

### **1. ArgoCD (GitOps)** 🔄
- ✅ Continuous Deployment من GitHub
- ✅ Auto-sync عند كل push
- ✅ Self-healing (يصلح نفسه تلقائياً)
- ✅ Rollback سهل
- ✅ UI Dashboard ممتاز

### **2. Helm (Package Manager)** 📦
- ✅ إدارة موحدة لكل Services
- ✅ Values files للـ environments مختلفة
- ✅ Templating قوي
- ✅ Versioning للـ deployments
- ✅ سهولة الـ upgrades

### **3. AWS Cognito (Authentication)** 🔐
- ✅ Managed service (لا deployment)
- ✅ MFA support
- ✅ Social login ready
- ✅ User pools + Identity pools
- ✅ مجاني حتى 50,000 users
- ✅ Integration مع NextAuth.js

---

## 📁 الملفات الجديدة

### **Terraform**
```
infra/terraform/
└── cognito.tf              # User pool + clients + identity pool
```

### **Helm Charts**
```
infra/helm/cashflow/
├── Chart.yaml              # Chart metadata
├── values.yaml             # Default values
└── templates/
    ├── _helpers.tpl        # Template helpers
    ├── frontend-deployment.yaml
    ├── tenant-deployment.yaml
    ├── ingestion-deployment.yaml
    ├── services.yaml
    └── ingress.yaml
```

### **ArgoCD**
```
infra/argocd/
└── application.yaml        # ArgoCD application definition
```

### **Scripts**
```
infra/scripts/
└── install-argocd.sh       # ArgoCD installation script
```

---

## 🚀 النشر الكامل

### **Step 1: Deploy Infrastructure**
```bash
cd infra/terraform
terraform init
terraform apply
```

**سينشر:**
- ✅ EKS Cluster
- ✅ RDS PostgreSQL
- ✅ ECR Repositories
- ✅ AWS Cognito User Pool
- ✅ VPC + Networking

---

### **Step 2: Install ArgoCD**
```bash
cd infra/scripts
./install-argocd.sh
```

**سيقوم بـ:**
1. ✅ Install ArgoCD على EKS
2. ✅ Expose ArgoCD UI
3. ✅ Connect GitHub repository
4. ✅ Deploy CashFlow application

---

### **Step 3: Build & Push Images**
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

cd ../frontend
docker build -t ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/cashflow/frontend:latest .
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/cashflow/frontend:latest
```

---

### **Step 4: Sync ArgoCD**
```bash
# Via CLI
argocd app sync cashflow

# Or via UI
# Open ArgoCD dashboard → Click "Sync" on cashflow app
```

---

## 🔄 GitOps Workflow

### **Development Workflow:**

1. **تطوير محلي:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Commit & Push:**
   ```bash
   git add .
   git commit -m "feat: new feature"
   git push origin main
   ```

3. **ArgoCD Auto-Sync:**
   - ArgoCD يكتشف التغيير في GitHub
   - يقارن الـ desired state مع الـ current state
   - ينشر التغييرات تلقائياً
   - يعرض الـ status في Dashboard

4. **Verify:**
   ```bash
   kubectl get pods -n cashflow-dev
   argocd app get cashflow
   ```

---

## 🔐 AWS Cognito Setup

### **User Pool Created:**
- **Name:** `cashflow-dev-users`
- **Domain:** `cashflow-dev-auth.auth.us-east-1.amazoncognito.com`
- **MFA:** Optional
- **Password Policy:** Strong (8+ chars, symbols, numbers)

### **Clients:**
1. **Frontend Client:**
   - OAuth flows: Authorization Code, Implicit
   - Callback URLs: `https://app.TadFuq.ai/api/auth/callback/cognito`
   - Scopes: email, openid, profile

2. **Backend Client:**
   - OAuth flow: Client Credentials
   - For service-to-service auth

### **Custom Attributes:**
- `tenant_id` - للـ multi-tenancy

---

## 📊 ArgoCD Dashboard

### **Access:**
```
URL: https://ARGOCD_URL
Username: admin
Password: (from install script)
```

### **Features:**
- 📊 Real-time sync status
- 🔄 Manual/Auto sync
- 📜 Deployment history
- ↩️ Rollback to previous versions
- 🔍 Resource tree view
- 📝 Logs viewer

---

## 🎨 Helm Values

### **Environment-specific values:**

**Development (`values-dev.yaml`):**
```yaml
frontend:
  replicaCount: 1
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
```

**Production (`values-prod.yaml`):**
```yaml
frontend:
  replicaCount: 3
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
autoscaling:
  enabled: true
  maxReplicas: 10
```

### **Deploy with specific values:**
```bash
helm upgrade --install cashflow ./infra/helm/cashflow \
  -f ./infra/helm/cashflow/values-prod.yaml \
  -n cashflow-dev
```

---

## 💰 التكلفة

**شهرياً (us-east-1):**
- EKS Cluster: $73
- EC2 Nodes (2x t3.medium): $60
- RDS (db.t4g.micro): $15
- ALB: $20
- **Cognito: $0** (حتى 50,000 MAU)
- **ArgoCD: $0** (self-hosted)
- **المجموع: ~$168/شهر**

---

## 🔍 Monitoring & Debugging

### **Check ArgoCD sync status:**
```bash
argocd app get cashflow
argocd app sync cashflow
argocd app history cashflow
```

### **Check Helm releases:**
```bash
helm list -n cashflow-dev
helm status cashflow -n cashflow-dev
helm history cashflow -n cashflow-dev
```

### **Check Kubernetes resources:**
```bash
kubectl get all -n cashflow-dev
kubectl logs -f deployment/frontend -n cashflow-dev
kubectl describe pod <pod-name> -n cashflow-dev
```

### **Rollback:**
```bash
# Via ArgoCD
argocd app rollback cashflow <revision>

# Via Helm
helm rollback cashflow <revision> -n cashflow-dev
```

---

## 🎯 الخطوات التالية

1. ✅ `terraform apply` - Deploy infrastructure
2. ✅ `./install-argocd.sh` - Install ArgoCD
3. ✅ Build & push Docker images
4. ✅ ArgoCD auto-syncs from GitHub
5. ✅ Access apps:
   - Frontend: `https://app.TadFuq.ai`
   - Backend: `https://api.TadFuq.ai`
   - ArgoCD: `https://ARGOCD_URL`

---

## 📝 Best Practices

### **Git Workflow:**
- ✅ Feature branches
- ✅ Pull requests
- ✅ ArgoCD syncs from `main` branch
- ✅ Tag releases: `v1.0.0`

### **Secrets Management:**
- ✅ Cognito credentials in Kubernetes secrets
- ✅ DB credentials from AWS Secrets Manager
- ✅ Never commit secrets to Git

### **Deployment:**
- ✅ Use Helm for templating
- ✅ ArgoCD for GitOps
- ✅ Separate values files per environment
- ✅ Enable auto-sync for dev, manual for prod

---

**الآن عندك Production-Ready Setup!** 🎉

- ✅ GitOps with ArgoCD
- ✅ Package management with Helm
- ✅ Managed auth with Cognito
- ✅ Full automation
- ✅ Easy rollbacks
- ✅ Scalable & secure
