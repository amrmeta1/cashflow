#!/bin/bash
set -e

# CashFlow.ai - AWS Deployment Script
# Deploys backend services to ECS Fargate

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/infra/terraform"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install it first."
        exit 1
    fi
    
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform not found. Please install it first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install it first."
        exit 1
    fi
    
    log_info "All prerequisites met ✓"
}

# Get AWS account ID
get_aws_account_id() {
    aws sts get-caller-identity --query Account --output text
}

# Build and push Docker images
build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    local AWS_ACCOUNT_ID=$(get_aws_account_id)
    local AWS_REGION=${AWS_REGION:-me-south-1}
    local ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    
    # Login to ECR
    log_info "Logging in to ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ECR_REGISTRY"
    
    # Build and push tenant-service
    log_info "Building tenant-service..."
    cd "$PROJECT_ROOT/backend"
    docker build -t cashflow/tenant-service:latest -f ../infra/docker/Dockerfile .
    docker tag cashflow/tenant-service:latest \
        "${ECR_REGISTRY}/cashflow/tenant-service:latest"
    docker push "${ECR_REGISTRY}/cashflow/tenant-service:latest"
    
    # Build and push ingestion-service
    log_info "Building ingestion-service..."
    docker build -t cashflow/ingestion-service:latest -f ../infra/docker/Dockerfile.ingestion .
    docker tag cashflow/ingestion-service:latest \
        "${ECR_REGISTRY}/cashflow/ingestion-service:latest"
    docker push "${ECR_REGISTRY}/cashflow/ingestion-service:latest"
    
    log_info "Docker images pushed successfully ✓"
}

# Run Terraform
run_terraform() {
    log_info "Running Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init
    
    # Plan
    log_info "Planning infrastructure changes..."
    terraform plan -out=tfplan
    
    # Apply
    log_warn "About to apply infrastructure changes. Press Ctrl+C to cancel..."
    sleep 5
    terraform apply tfplan
    
    log_info "Infrastructure deployed successfully ✓"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Get DB endpoint from Terraform output
    cd "$TERRAFORM_DIR"
    local DB_ENDPOINT=$(terraform output -raw db_endpoint)
    local DB_PASSWORD_ARN=$(terraform output -raw db_password_secret_arn)
    
    # Get password from Secrets Manager
    local DB_PASSWORD=$(aws secretsmanager get-secret-value \
        --secret-id "$DB_PASSWORD_ARN" \
        --query SecretString --output text | jq -r '.password')
    
    # Run migrations
    cd "$PROJECT_ROOT/backend"
    export MIGRATE_DSN="postgres://cashflow:${DB_PASSWORD}@${DB_ENDPOINT}/cashflow?sslmode=require"
    
    if command -v migrate &> /dev/null; then
        migrate -path migrations -database "$MIGRATE_DSN" up
        log_info "Migrations completed ✓"
    else
        log_warn "golang-migrate not found. Please run migrations manually."
        log_info "Connection string: $MIGRATE_DSN"
    fi
}

# Update ECS services
update_ecs_services() {
    log_info "Updating ECS services..."
    
    cd "$TERRAFORM_DIR"
    local CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
    local AWS_REGION=${AWS_REGION:-me-south-1}
    
    # Force new deployment
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service cashflow-dev-tenant \
        --force-new-deployment \
        --region "$AWS_REGION" > /dev/null
    
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service cashflow-dev-ingestion \
        --force-new-deployment \
        --region "$AWS_REGION" > /dev/null
    
    log_info "ECS services updated ✓"
}

# Display deployment info
show_deployment_info() {
    log_info "Deployment complete! 🎉"
    echo ""
    
    cd "$TERRAFORM_DIR"
    local ALB_URL=$(terraform output -raw alb_url)
    local TENANT_ENDPOINT=$(terraform output -raw tenant_service_endpoint)
    local INGESTION_ENDPOINT=$(terraform output -raw ingestion_service_endpoint)
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  CashFlow.ai - Deployment Information"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  Load Balancer:      $ALB_URL"
    echo "  Tenant Service:     $TENANT_ENDPOINT"
    echo "  Ingestion Service:  $INGESTION_ENDPOINT"
    echo ""
    echo "  Health Checks:"
    echo "    curl $ALB_URL/healthz"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main deployment flow
main() {
    log_info "Starting CashFlow.ai AWS deployment..."
    
    check_prerequisites
    
    # Parse arguments
    SKIP_TERRAFORM=false
    SKIP_BUILD=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-terraform)
                SKIP_TERRAFORM=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    if [ "$SKIP_TERRAFORM" = false ]; then
        run_terraform
    fi
    
    if [ "$SKIP_BUILD" = false ]; then
        build_and_push_images
        update_ecs_services
    fi
    
    run_migrations
    show_deployment_info
}

main "$@"
