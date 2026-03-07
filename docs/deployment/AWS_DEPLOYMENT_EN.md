# AWS Deployment Guide - CashFlow.ai

## Overview

This guide explains how to deploy the CashFlow.ai platform on AWS using:
- **ECS Fargate** - Serverless container orchestration
- **RDS PostgreSQL** - Managed database
- **Application Load Balancer** - Traffic distribution
- **VPC** - Isolated virtual network
- **ECR** - Docker image registry

## Infrastructure Architecture

### Main Components

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

### AWS Region

- **Default Region**: `me-south-1` (Bahrain)
- **Closest to**: Saudi Arabia, Qatar, UAE, Kuwait, Oman

## Prerequisites

### 1. Required Tools

```bash
# AWS CLI
brew install awscli

# Terraform
brew install terraform

# Docker
brew install --cask docker

# golang-migrate (optional for migrations)
brew install golang-migrate
```

### 2. Configure AWS CLI

```bash
# Configure AWS credentials
aws configure

# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: me-south-1
# - Default output format: json
```

### 3. Verify Permissions

Ensure your AWS account has permissions for:
- EC2 (VPC, Subnets, Security Groups)
- ECS (Cluster, Services, Tasks)
- RDS (Database instances)
- ECR (Repositories)
- IAM (Roles, Policies)
- Secrets Manager
- CloudWatch Logs

## Deployment Steps

### Method 1: Automated Deployment (Recommended)

```bash
# From project root
cd /Users/adam/Desktop/tad/tadfuq-platform

# Run deployment script
./infra/scripts/deploy.sh
```

The script will:
1. ✅ Check prerequisites
2. ✅ Create infrastructure via Terraform
3. ✅ Build and push Docker images to ECR
4. ✅ Run database migrations
5. ✅ Update ECS services
6. ✅ Display deployment information

### Method 2: Manual Step-by-Step Deployment

#### Step 1: Create Infrastructure

```bash
cd infra/terraform

# Copy variables file
cp terraform.tfvars.example terraform.tfvars

# Edit variables as needed
nano terraform.tfvars

# Initialize Terraform
terraform init

# Review changes
terraform plan

# Apply infrastructure
terraform apply
```

**Expected time**: 10-15 minutes (RDS takes most of the time)

#### Step 2: Build and Push Docker Images

```bash
# Get account information
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="me-south-1"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin $ECR_REGISTRY

# Build tenant-service
cd backend
docker build -t cashflow/tenant-service:latest -f ../infra/docker/Dockerfile .
docker tag cashflow/tenant-service:latest \
    ${ECR_REGISTRY}/cashflow/tenant-service:latest
docker push ${ECR_REGISTRY}/cashflow/tenant-service:latest

# Build ingestion-service
docker build -t cashflow/ingestion-service:latest -f ../infra/docker/Dockerfile.ingestion .
docker tag cashflow/ingestion-service:latest \
    ${ECR_REGISTRY}/cashflow/ingestion-service:latest
docker push ${ECR_REGISTRY}/cashflow/ingestion-service:latest
```

#### Step 3: Run Database Migrations

```bash
cd backend

# Get database info from Terraform
cd ../infra/terraform
DB_ENDPOINT=$(terraform output -raw db_endpoint)
DB_PASSWORD_ARN=$(terraform output -raw db_password_secret_arn)

# Get password from Secrets Manager
DB_PASSWORD=$(aws secretsmanager get-secret-value \
    --secret-id "$DB_PASSWORD_ARN" \
    --query SecretString --output text | jq -r '.password')

# Run migrations
cd ../../backend
migrate -path migrations \
    -database "postgres://cashflow:${DB_PASSWORD}@${DB_ENDPOINT}/cashflow?sslmode=require" up
```

#### Step 4: Update ECS Services

```bash
cd ../infra/terraform
CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)

# Force new deployment
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

## Verify Deployment

### 1. Health Checks

```bash
# Get Load Balancer URL
cd infra/terraform
ALB_URL=$(terraform output -raw alb_url)

# Check tenant-service
curl $ALB_URL/healthz

# Check ingestion-service  
curl $ALB_URL/api/ingestion/healthz
```

### 2. Monitor ECS Tasks

```bash
# List services
aws ecs list-services --cluster cashflow-dev-cluster --region me-south-1

# List tasks
aws ecs list-tasks --cluster cashflow-dev-cluster --region me-south-1
```

### 3. View Logs

```bash
# Tail CloudWatch logs
aws logs tail /ecs/cashflow-dev --follow --region me-south-1
```

## Expected Costs (Monthly)

### Dev/Staging Environment

| Resource | Specifications | Approx. Cost (USD) |
|----------|---------------|-------------------|
| **RDS PostgreSQL** | db.t4g.micro, 20GB | ~$15 |
| **ECS Fargate** | 2 tasks × 0.5 vCPU, 1GB | ~$20 |
| **ALB** | Application Load Balancer | ~$20 |
| **NAT Gateway** | 1 NAT Gateway | ~$35 |
| **Data Transfer** | Estimated | ~$10 |
| **CloudWatch Logs** | 7 days retention | ~$5 |
| **Total** | | **~$105/month** |

### Cost Optimization

```bash
# Destroy environment when not in use
terraform destroy

# Or scale down tasks
aws ecs update-service \
    --cluster cashflow-dev-cluster \
    --service cashflow-dev-tenant \
    --desired-count 0
```

## Troubleshooting

### Issue: ECS Tasks Fail to Start

```bash
# Check failure reasons
aws ecs describe-tasks \
    --cluster cashflow-dev-cluster \
    --tasks <task-id> \
    --region me-south-1
```

**Common Solutions**:
- Verify environment variables
- Check Security Groups
- Review CloudWatch Logs

### Issue: Cannot Access ALB

```bash
# Check Security Group
aws ec2 describe-security-groups \
    --filters "Name=tag:Name,Values=cashflow-dev-alb-sg" \
    --region me-south-1
```

**Solution**: Ensure ports 80 and 443 are open

### Issue: Database Connection Timeout

```bash
# Check RDS Security Group
aws ec2 describe-security-groups \
    --filters "Name=tag:Name,Values=cashflow-dev-rds-sg" \
    --region me-south-1
```

**Solution**: Verify ECS tasks can access port 5432

## Updates and Maintenance

### Update Code

```bash
# Build and push new images
./infra/scripts/deploy.sh --skip-terraform

# Or manually
cd backend
docker build -t cashflow/tenant-service:latest -f ../infra/docker/Dockerfile .
# ... push image
aws ecs update-service --cluster cashflow-dev-cluster \
    --service cashflow-dev-tenant --force-new-deployment
```

### Update Infrastructure

```bash
cd infra/terraform

# Modify files
nano variables.tf

# Apply changes
terraform plan
terraform apply
```

### Rollback

```bash
# Revert to previous image version
aws ecs update-service \
    --cluster cashflow-dev-cluster \
    --service cashflow-dev-tenant \
    --task-definition cashflow-dev-tenant:PREVIOUS_VERSION
```

## Security

### Implemented Best Practices

✅ **Network Isolation**: Services in Private Subnets  
✅ **Encryption**: RDS encrypted at rest  
✅ **Secrets Management**: Passwords in Secrets Manager  
✅ **Security Groups**: Strict access rules  
✅ **IAM Roles**: Least privilege per service  
✅ **CloudWatch**: Centralized monitoring and logging  

### Additional Production Recommendations

- [ ] Enable HTTPS on ALB (ACM Certificate)
- [ ] Enable WAF on ALB
- [ ] Multi-AZ deployment for RDS
- [ ] Auto-scaling for ECS tasks
- [ ] Automated RDS backups
- [ ] CloudTrail for auditing
- [ ] GuardDuty for threat detection

## Next Steps

1. **Setup Domain Name**: Point domain to ALB
2. **SSL/TLS**: Add SSL certificate from ACM
3. **CI/CD**: Setup GitHub Actions for automated deployment
4. **Monitoring**: Configure CloudWatch Dashboards
5. **Alerting**: Setup SNS notifications
6. **Frontend**: Deploy Next.js on Vercel or Amplify

## Support

For help or questions:
- Review [AWS Documentation](https://docs.aws.amazon.com/)
- Review [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- Open an issue in the project
