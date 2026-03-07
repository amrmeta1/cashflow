#!/bin/bash
set -e

echo "🚀 Deploying CashFlow.ai to EKS"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-east-1"

echo -e "${BLUE}📊 AWS Account: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${BLUE}📍 Region: ${AWS_REGION}${NC}"

# Step 1: Apply Terraform
echo -e "\n${GREEN}Step 1: Applying Terraform configuration...${NC}"
cd ../terraform
terraform init
terraform apply -auto-approve

# Get outputs
EKS_CLUSTER_NAME=$(terraform output -raw eks_cluster_name)
ALB_CONTROLLER_ROLE_ARN=$(terraform output -raw alb_controller_role_arn)

echo -e "${GREEN}✅ Terraform applied${NC}"
echo -e "${BLUE}EKS Cluster: ${EKS_CLUSTER_NAME}${NC}"

# Step 2: Configure kubectl
echo -e "\n${GREEN}Step 2: Configuring kubectl...${NC}"
aws eks update-kubeconfig --name ${EKS_CLUSTER_NAME} --region ${AWS_REGION}
echo -e "${GREEN}✅ kubectl configured${NC}"

# Step 3: Install AWS Load Balancer Controller
echo -e "\n${GREEN}Step 3: Installing AWS Load Balancer Controller...${NC}"

# Create service account
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: aws-load-balancer-controller
  namespace: kube-system
  annotations:
    eks.amazonaws.com/role-arn: ${ALB_CONTROLLER_ROLE_ARN}
EOF

# Install controller using Helm
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=${EKS_CLUSTER_NAME} \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set region=${AWS_REGION} \
  --set vpcId=$(terraform output -raw vpc_id)

echo -e "${GREEN}✅ AWS Load Balancer Controller installed${NC}"

# Step 4: Build and push Docker images
echo -e "\n${GREEN}Step 4: Building and pushing Docker images...${NC}"

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build and push tenant service
cd ../../backend
echo "Building tenant-service..."
docker build -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/cashflow/tenant-service:latest -f cmd/tenant-service/Dockerfile .
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/cashflow/tenant-service:latest

# Build and push ingestion service
echo "Building ingestion-service..."
docker build -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/cashflow/ingestion-service:latest -f cmd/ingestion-service/Dockerfile .
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/cashflow/ingestion-service:latest

# Build and push frontend
cd ../frontend
echo "Building frontend..."
docker build -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/cashflow/frontend:latest .
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/cashflow/frontend:latest

echo -e "${GREEN}✅ Docker images built and pushed${NC}"

# Step 5: Create database secret
echo -e "\n${GREEN}Step 5: Creating database credentials secret...${NC}"

DB_HOST=$(cd ../infra/terraform && terraform output -raw db_endpoint | cut -d: -f1)
DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id $(cd ../infra/terraform && terraform output -raw db_password_secret_arn) --query SecretString --output text | jq -r .password)

kubectl create namespace cashflow-dev --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic db-credentials \
  --from-literal=host=${DB_HOST} \
  --from-literal=password=${DB_PASSWORD} \
  --namespace=cashflow-dev \
  --dry-run=client -o yaml | kubectl apply -f -

# Create frontend secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
kubectl create secret generic frontend-secrets \
  --from-literal=nextauth-secret=${NEXTAUTH_SECRET} \
  --namespace=cashflow-dev \
  --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✅ Secrets created${NC}"

# Step 6: Deploy Kubernetes manifests
echo -e "\n${GREEN}Step 6: Deploying Kubernetes manifests...${NC}"

cd ../infra/k8s

# Replace AWS_ACCOUNT_ID in manifests
for file in *.yaml; do
  sed "s/\${AWS_ACCOUNT_ID}/${AWS_ACCOUNT_ID}/g" $file | kubectl apply -f -
done

echo -e "${GREEN}✅ Kubernetes manifests deployed${NC}"

# Step 7: Wait for services to be ready
echo -e "\n${GREEN}Step 7: Waiting for services to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/tenant-service -n cashflow-dev
kubectl wait --for=condition=available --timeout=300s deployment/ingestion-service -n cashflow-dev
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n cashflow-dev

echo -e "${GREEN}✅ Services are ready${NC}"

# Step 8: Get ALB URL
echo -e "\n${GREEN}Step 8: Getting ALB URL...${NC}"
sleep 30  # Wait for ALB to be created
ALB_URL=$(kubectl get ingress cashflow-ingress -n cashflow-dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}EKS Cluster: ${EKS_CLUSTER_NAME}${NC}"
echo -e "${BLUE}Frontend: https://app.tadfuq.ai${NC}"
echo -e "${BLUE}Backend API: https://api.tadfuq.ai${NC}"
echo -e "${BLUE}Tenant API: https://api.tadfuq.ai/api/tenant${NC}"
echo -e "${BLUE}Ingestion API: https://api.tadfuq.ai/api/ingestion${NC}"
echo -e "\n${BLUE}To check status:${NC}"
echo -e "  kubectl get pods -n cashflow-dev"
echo -e "  kubectl get ingress -n cashflow-dev"
echo -e "  kubectl logs -f deployment/frontend -n cashflow-dev"
echo -e "  kubectl logs -f deployment/tenant-service -n cashflow-dev"
