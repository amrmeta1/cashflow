# CashFlow.ai - Terraform Infrastructure

## Quick Start

```bash
# 1. Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# 2. Initialize Terraform
terraform init

# 3. Plan infrastructure
terraform plan

# 4. Apply infrastructure
terraform apply
```

## What Gets Created

### Networking
- VPC with CIDR 10.0.0.0/16
- 2 Public Subnets (for ALB)
- 2 Private Subnets (for ECS tasks and RDS)
- Internet Gateway
- NAT Gateway
- Route Tables

### Compute
- ECS Fargate Cluster
- 2 ECS Services (tenant-service, ingestion-service)
- Task Definitions with CloudWatch logging
- IAM Roles for task execution

### Database
- RDS PostgreSQL 16 (Single-AZ for dev)
- Automated backups (1 day retention)
- Encrypted storage
- Password managed in Secrets Manager

### Load Balancing
- Application Load Balancer
- 2 Target Groups
- HTTP Listener with path-based routing

### Container Registry
- 2 ECR Repositories (tenant-service, ingestion-service)
- Lifecycle policies (keep last 10 images)
- Image scanning enabled

### Security
- Security Groups for ALB, ECS, and RDS
- IAM roles with least privilege
- Secrets Manager for database password

## Outputs

After `terraform apply`, you'll get:

```bash
# View all outputs
terraform output

# Specific outputs
terraform output alb_url
terraform output db_endpoint
terraform output ecr_tenant_service_url
```

## Cost Estimate

Dev/Staging environment: ~$105/month

See deployment docs for detailed breakdown.

## Custom Domain Setup (Optional)

To use a custom domain name with SSL/HTTPS:

1. **Configure domain in terraform.tfvars:**
   ```hcl
   domain_name          = "api.cashflow.com"
   create_hosted_zone   = true  # false if domain managed elsewhere
   create_api_subdomain = true
   ```

2. **Apply changes:**
   ```bash
   terraform apply
   ```

3. **Update nameservers** (if create_hosted_zone = true):
   ```bash
   terraform output nameservers
   ```
   Update these at your domain registrar.

4. **Wait for DNS propagation** (up to 48 hours)

 **Detailed Guide:** See `docs/deployment/DOMAIN_SETUP_AR.md` or `DOMAIN_SETUP_EN.md`

## Customization

Edit `terraform.tfvars`:

```hcl
# Change region
aws_region = "us-east-1"

# Scale resources
tenant_service_cpu    = 1024
tenant_service_memory = 2048
desired_count         = 2

# Database size
db_instance_class    = "db.t4g.small"
db_allocated_storage = 50
```

## Destroy Infrastructure

```bash
# Remove all resources
terraform destroy
```

**Warning**: This will delete the database. Ensure you have backups!

## Files

- `main.tf` - Provider configuration
- `variables.tf` - Input variables
- `outputs.tf` - Output values
- `vpc.tf` - VPC and networking
- `security_groups.tf` - Security groups
- `rds.tf` - PostgreSQL database
- `ecr.tf` - Container registries
- `alb.tf` - Load balancer
- `ecs.tf` - ECS cluster and services

## Notes

- Default region is `me-south-1` (Bahrain) for GCC proximity
- RDS is Single-AZ for dev (change `multi_az = true` for production)
- No auto-scaling configured (add for production)
- HTTP only (add ACM certificate for HTTPS)
