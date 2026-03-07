# ✅ Frontend + Backend في نفس EKS Cluster

## 🎯 البنية الكاملة

```
EKS Cluster (cashflow-dev-cluster)
│
├── Frontend (Next.js)
│   ├── Replicas: 2
│   ├── Port: 3000
│   └── Domain: app.TadFuq.ai
│
├── Tenant Service (Go)
│   ├── Replicas: 2
│   ├── Port: 8080
│   └── Routes: /api/tenant, /tenants, /me, /audit-logs
│
└── Ingestion Service (Go)
    ├── Replicas: 2
    ├── Port: 8081
    └── Routes: /api/ingestion
```

---

## 📁 الملفات الجديدة

### **Frontend**
```
frontend/
├── Dockerfile                # Multi-stage build for Next.js
└── next.config.js            # Updated with output: 'standalone'
```

### **Kubernetes**
```
infra/k8s/
├── frontend.yaml             # Frontend deployment + service
└── ingress.yaml              # Updated with frontend routing
```

### **Terraform**
```
infra/terraform/
└── ecr.tf                    # Added frontend ECR repository
```

---

## 🌐 Routing

### **ALB Ingress يوجه:**

**Frontend (app.TadFuq.ai):**
```
https://app.TadFuq.ai/          → Frontend (port 3000)
https://app.TadFuq.ai/login     → Frontend
https://app.TadFuq.ai/dashboard → Frontend
```

**Backend (api.TadFuq.ai):**
```
https://api.TadFuq.ai/api/tenant    → Tenant Service (port 8080)
https://api.TadFuq.ai/api/ingestion → Ingestion Service (port 8081)
```

---

## 🚀 النشر

### **كل شيء في أمر واحد:**

```bash
cd infra/scripts
./deploy-eks.sh
```

**سيقوم بـ:**
1. ✅ Deploy Terraform (EKS + RDS + ECR)
2. ✅ Build Frontend Docker image
3. ✅ Build Backend Docker images
4. ✅ Push all images to ECR
5. ✅ Deploy Frontend + Backend to EKS
6. ✅ Configure ALB Ingress

---

## 📦 Docker Images

```
ECR Repositories:
├── cashflow/frontend:latest         (Next.js)
├── cashflow/tenant-service:latest   (Go)
└── cashflow/ingestion-service:latest (Go)
```

---

## 🔐 Secrets

### **Database Credentials:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: cashflow-dev
data:
  host: <RDS_ENDPOINT>
  password: <DB_PASSWORD>
```

### **Frontend Secrets:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: frontend-secrets
  namespace: cashflow-dev
data:
  nextauth-secret: <GENERATED_SECRET>
```

---

## 🎨 المميزات

### **✅ كل شيء في مكان واحد**
- Frontend و Backend في نفس الـ Cluster
- سهولة الـ Networking بين Services
- Secrets و ConfigMaps مشتركة

### **✅ Scaling موحد**
```bash
# Scale frontend
kubectl scale deployment frontend --replicas=5 -n cashflow-dev

# Scale backend
kubectl scale deployment tenant-service --replicas=3 -n cashflow-dev
```

### **✅ Monitoring موحد**
```bash
# Check all pods
kubectl get pods -n cashflow-dev

# Logs
kubectl logs -f deployment/frontend -n cashflow-dev
kubectl logs -f deployment/tenant-service -n cashflow-dev
```

### **✅ تكلفة أقل**
- مشاركة نفس الـ Nodes
- مشاركة نفس الـ ALB
- لا حاجة لـ Amplify منفصل

---

## 💰 التكلفة

**شهرياً (us-east-1):**
- EKS Cluster: $73
- EC2 Nodes (2x t3.medium): $60
- RDS (db.t4g.micro): $15
- ALB: $20
- **المجموع: ~$168/شهر**

*(بدلاً من $168 + $15 Amplify = $183)*

---

## 🔍 التحقق

### **Check Deployments:**
```bash
kubectl get deployments -n cashflow-dev
```

**Expected:**
```
NAME                READY   UP-TO-DATE   AVAILABLE
frontend            2/2     2            2
tenant-service      2/2     2            2
ingestion-service   2/2     2            2
```

### **Check Services:**
```bash
kubectl get svc -n cashflow-dev
```

### **Check Ingress:**
```bash
kubectl get ingress -n cashflow-dev
```

### **Test URLs:**
```bash
# Frontend
curl https://app.TadFuq.ai

# Backend
curl https://api.TadFuq.ai/api/tenant/health
```

---

## 🎯 الخطوات التالية

1. ✅ شغّل `./deploy-eks.sh`
2. ✅ انتظر 10-15 دقيقة
3. ✅ افتح `https://app.TadFuq.ai`
4. ✅ اختبر Login و APIs

---

## 📝 ملاحظات

### **Environment Variables**
Frontend يحصل على environment variables من:
- Kubernetes ConfigMap (للـ public vars)
- Kubernetes Secret (للـ sensitive vars)

### **Hot Reload**
للتطوير المحلي، استخدم:
```bash
cd frontend
npm run dev
```

للـ Production، استخدم Docker image في EKS.

---

**الآن كل شيء في مكان واحد!** 🎉

Frontend + Backend + Database = **EKS Cluster واحد**
