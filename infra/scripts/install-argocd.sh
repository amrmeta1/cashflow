#!/bin/bash
set -e

echo "🚀 Installing ArgoCD on EKS"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Create ArgoCD namespace
echo -e "${GREEN}Step 1: Creating ArgoCD namespace...${NC}"
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

# Step 2: Install ArgoCD
echo -e "${GREEN}Step 2: Installing ArgoCD...${NC}"
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Step 3: Wait for ArgoCD to be ready
echo -e "${GREEN}Step 3: Waiting for ArgoCD to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd

# Step 4: Patch ArgoCD server to use LoadBalancer (or use Ingress)
echo -e "${GREEN}Step 4: Exposing ArgoCD server...${NC}"
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'

# Step 5: Get initial admin password
echo -e "${GREEN}Step 5: Getting ArgoCD admin password...${NC}"
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

# Step 6: Get ArgoCD server URL
echo -e "${GREEN}Step 6: Getting ArgoCD server URL...${NC}"
sleep 30  # Wait for LoadBalancer
ARGOCD_URL=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Step 7: Install ArgoCD CLI (optional)
echo -e "${GREEN}Step 7: Installing ArgoCD CLI...${NC}"
if ! command -v argocd &> /dev/null; then
    echo "Installing ArgoCD CLI..."
    curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-darwin-amd64
    chmod +x /usr/local/bin/argocd
else
    echo "ArgoCD CLI already installed"
fi

# Step 8: Login to ArgoCD
echo -e "${GREEN}Step 8: Logging in to ArgoCD...${NC}"
argocd login ${ARGOCD_URL} --username admin --password ${ARGOCD_PASSWORD} --insecure

# Step 9: Add GitHub repository
echo -e "${GREEN}Step 9: Adding GitHub repository...${NC}"
echo "Please enter your GitHub Personal Access Token:"
read -s GITHUB_TOKEN

argocd repo add https://github.com/amrmeta1/cashflow.git \
  --username amrmeta1 \
  --password ${GITHUB_TOKEN} \
  --insecure-skip-server-verification

# Step 10: Deploy CashFlow application
echo -e "${GREEN}Step 10: Deploying CashFlow application...${NC}"
kubectl apply -f ../argocd/application.yaml

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 ArgoCD Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}ArgoCD URL: https://${ARGOCD_URL}${NC}"
echo -e "${BLUE}Username: admin${NC}"
echo -e "${BLUE}Password: ${ARGOCD_PASSWORD}${NC}"
echo -e "\n${BLUE}To access ArgoCD:${NC}"
echo -e "  1. Open: https://${ARGOCD_URL}"
echo -e "  2. Login with credentials above"
echo -e "  3. Check 'cashflow' application"
echo -e "\n${BLUE}To sync application:${NC}"
echo -e "  argocd app sync cashflow"
echo -e "  argocd app get cashflow"
