# Frontend Build Issue - Next.js Production Build

**Date:** March 5, 2026  
**Status:** ⚠️ Requires Fix

---

## 🔍 Problem Summary

Frontend builds successfully in **development mode** but fails in **production Docker build** due to React Context Provider issues.

### Error Details:
```
Error: useCompany must be used within CompanyProvider
Error occurred prerendering page "/app/scenario-planner"
```

---

## ✅ What Works

1. **Local Development Build:**
   ```bash
   cd frontend
   npm run build
   # ✅ Compiles successfully
   ```

2. **Kubernetes Manifests:** Created and ready
   - `infra/k8s/base/frontend.yaml`
   - `infra/k8s/argocd/frontend-app.yaml`

3. **Infrastructure:** All ready for frontend deployment
   - LoadBalancer service configured
   - DNS ready to be configured
   - ArgoCD application defined

---

## ❌ What Fails

**Docker Production Build:**
```bash
docker buildx build --platform linux/amd64 \
  -t 747253121951.dkr.ecr.us-east-1.amazonaws.com/cashflow/frontend:latest \
  --push .
# ❌ Fails during static page generation
```

**Root Cause:**
- React Context Providers (CompanyProvider, etc.) not properly wrapped in production build
- Static page generation fails for pages using these contexts
- Issue appears only in Docker production build, not local build

---

## 🔧 Attempted Solutions

1. ✅ **Simplified Dockerfile** - Still fails
2. ✅ **Fixed ENV syntax** - Still fails  
3. ✅ **Added .dockerignore** - Still fails
4. ✅ **Increased memory** (`NODE_OPTIONS="--max-old-space-size=4096"`) - Still fails

---

## 💡 Recommended Solutions

### **Option 1: Fix Context Provider Wrapping (Recommended)**

Update `frontend/app/layout.tsx` to ensure all Context Providers are properly wrapped:

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SessionProvider>
          <CompanyProvider>
            <TenantProvider>
              {children}
            </TenantProvider>
          </CompanyProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

### **Option 2: Disable Static Generation for Problematic Pages**

Add to pages that use Context:

```tsx
// app/scenario-planner/page.tsx
export const dynamic = 'force-dynamic';
// or
export const revalidate = 0;
```

### **Option 3: Use Client-Side Rendering**

Mark pages as client components:

```tsx
'use client';
// Rest of component code
```

### **Option 4: Deploy with Development Build (Temporary)**

For immediate deployment, use development mode:

```dockerfile
# Dockerfile.dev
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

---

## 📋 Files to Check

1. **Context Providers:**
   - `frontend/contexts/CompanyContext.tsx`
   - `frontend/contexts/TenantContext.tsx`
   - `frontend/app/layout.tsx`

2. **Pages Using Contexts:**
   - `frontend/app/scenario-planner/page.tsx`
   - `frontend/app/dashboard/page.tsx`
   - All pages under `/app/app/*`

3. **Build Configuration:**
   - `frontend/next.config.js`
   - `frontend/package.json`

---

## 🚀 Quick Fix Steps

1. **Identify Context Usage:**
   ```bash
   cd frontend
   grep -r "useCompany" app/
   grep -r "useTenant" app/
   ```

2. **Add Dynamic Rendering:**
   ```bash
   # Add to each problematic page
   echo "export const dynamic = 'force-dynamic';" >> app/scenario-planner/page.tsx
   ```

3. **Rebuild:**
   ```bash
   npm run build
   # Should succeed now
   ```

4. **Build Docker Image:**
   ```bash
   docker buildx build --platform linux/amd64 \
     -t 747253121951.dkr.ecr.us-east-1.amazonaws.com/cashflow/frontend:latest \
     --push .
   ```

---

## ✅ Once Fixed

After successful Docker build:

1. **Deploy via ArgoCD:**
   ```bash
   kubectl apply -f infra/k8s/argocd/frontend-app.yaml
   ```

2. **Configure DNS:**
   ```bash
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z05025173KCIQA1BDF937 \
     --change-batch '{
       "Changes": [{
         "Action": "UPSERT",
         "ResourceRecordSet": {
           "Name": "app.tadfuq.ai",
           "Type": "CNAME",
           "TTL": 300,
           "ResourceRecords": [{"Value": "[frontend-loadbalancer-dns]"}]
         }
       }]
     }'
   ```

3. **Verify Deployment:**
   ```bash
   kubectl get pods -l app=frontend
   kubectl get svc frontend
   curl http://app.tadfuq.ai
   ```

---

## 📊 Current Status

- **Backend Services:** ✅ 100% Deployed and Running
- **Infrastructure:** ✅ 100% Complete
- **GitOps:** ✅ 100% Configured
- **Frontend Manifests:** ✅ 100% Ready
- **Frontend Docker Build:** ❌ Blocked by Context Provider issue

**Overall Progress:** 95% Complete

---

**Next Action:** Fix Context Provider wrapping in `app/layout.tsx` and rebuild Docker image.
