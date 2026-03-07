#!/bin/bash

cd /Users/adam/Desktop/tad/tadfuq-platform

echo "=== Git Status ==="
git status

echo ""
echo "=== Adding Changes ==="
git add frontend/app/layout.tsx \
        frontend/app/app/layout.tsx \
        frontend/app/app/onboarding/layout.tsx \
        frontend/app/app/onboarding/page.tsx \
        frontend/app/login/page.tsx \
        infra/helm/frontend/values.yaml \
        infra/helm/frontend/values-production.yaml

echo ""
echo "=== Committing ==="
git commit -m "Enable production build: fix NextAuth static generation and deploy production image

- Add dynamic rendering config to root and onboarding layouts
- Remove dynamic exports from client components  
- Update Helm values to use production Docker image
- Production image: cashflow/frontend:production
- Fixes NextAuth useSession() pre-rendering errors"

echo ""
echo "=== Pushing to Git ==="
git push origin refactor/monorepo-structure

echo ""
echo "=== Waiting for ArgoCD sync (60s) ==="
sleep 60

echo ""
echo "=== Checking ArgoCD Status ==="
kubectl get app frontend-helm -n argocd

echo ""
echo "=== Checking Pods ==="
kubectl get pods -l app.kubernetes.io/instance=frontend-helm -n default

echo ""
echo "=== Checking Image Version ==="
kubectl describe pod -l app.kubernetes.io/instance=frontend-helm -n default | grep "Image:" | head -3

echo ""
echo "=== Done! ==="
