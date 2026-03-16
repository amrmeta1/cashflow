#!/bin/bash

# Staging Deployment Script
# This script deploys the new architecture to staging environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
STAGING_HOST="${STAGING_HOST:-staging.tadfuq.com}"
STAGING_USER="${STAGING_USER:-deploy}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-registry.tadfuq.com}"
VERSION="${VERSION:-2.0.0-staging}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Staging Deployment - New Architecture${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Host: $STAGING_HOST"
echo "Version: $VERSION"
echo "Registry: $DOCKER_REGISTRY"
echo ""

# Step 1: Pre-deployment checks
echo -e "${YELLOW}Step 1: Pre-deployment checks...${NC}"

# Check if we're on development branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "development" ]; then
    echo -e "${RED}Error: Must be on development branch${NC}"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Check if all tests pass
echo "Running tests..."
cd backend
if ! go test ./internal/... ./cmd/...; then
    echo -e "${RED}Error: Tests failed${NC}"
    exit 1
fi
cd ..

echo -e "${GREEN}✓ Pre-deployment checks passed${NC}"
echo ""

# Step 2: Build Docker images
echo -e "${YELLOW}Step 2: Building Docker images...${NC}"

# Build Tenant Service
echo "Building tenant-service..."
docker build \
    -t ${DOCKER_REGISTRY}/tenant-service:${VERSION} \
    -t ${DOCKER_REGISTRY}/tenant-service:staging-latest \
    -f deployments/docker/Dockerfile.tenant \
    --build-arg VERSION=${VERSION} \
    .

# Build Ingestion Service
echo "Building ingestion-service..."
docker build \
    -t ${DOCKER_REGISTRY}/ingestion-service:${VERSION} \
    -t ${DOCKER_REGISTRY}/ingestion-service:staging-latest \
    -f deployments/docker/Dockerfile.ingestion \
    --build-arg VERSION=${VERSION} \
    .

echo -e "${GREEN}✓ Docker images built${NC}"
echo ""

# Step 3: Push images to registry
echo -e "${YELLOW}Step 3: Pushing images to registry...${NC}"

docker push ${DOCKER_REGISTRY}/tenant-service:${VERSION}
docker push ${DOCKER_REGISTRY}/tenant-service:staging-latest
docker push ${DOCKER_REGISTRY}/ingestion-service:${VERSION}
docker push ${DOCKER_REGISTRY}/ingestion-service:staging-latest

echo -e "${GREEN}✓ Images pushed to registry${NC}"
echo ""

# Step 4: Deploy to staging
echo -e "${YELLOW}Step 4: Deploying to staging...${NC}"

# SSH to staging and deploy
ssh ${STAGING_USER}@${STAGING_HOST} << 'ENDSSH'
    set -e
    
    echo "Pulling latest images..."
    cd /opt/tadfuq
    docker-compose -f docker-compose.staging.yml pull
    
    echo "Stopping old containers..."
    docker-compose -f docker-compose.staging.yml down
    
    echo "Starting new containers..."
    docker-compose -f docker-compose.staging.yml up -d
    
    echo "Waiting for services to be healthy..."
    sleep 10
    
    # Check health
    if ! curl -f http://localhost:8080/health > /dev/null 2>&1; then
        echo "Error: Tenant service health check failed"
        exit 1
    fi
    
    if ! curl -f http://localhost:8081/health > /dev/null 2>&1; then
        echo "Error: Ingestion service health check failed"
        exit 1
    fi
    
    echo "Services are healthy!"
ENDSSH

echo -e "${GREEN}✓ Deployment completed${NC}"
echo ""

# Step 5: Run smoke tests
echo -e "${YELLOW}Step 5: Running smoke tests...${NC}"

# Test health endpoints
echo "Testing health endpoints..."
if curl -f http://${STAGING_HOST}:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Tenant service is healthy${NC}"
else
    echo -e "${RED}✗ Tenant service health check failed${NC}"
    exit 1
fi

if curl -f http://${STAGING_HOST}:8081/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Ingestion service is healthy${NC}"
else
    echo -e "${RED}✗ Ingestion service health check failed${NC}"
    exit 1
fi

# Test file upload (if test data exists)
if [ -f "backend/test-data/bank-statement-sample.csv" ]; then
    echo "Testing CSV upload..."
    RESPONSE=$(curl -s -X POST \
        http://${STAGING_HOST}:8081/api/v1/tenants/test-tenant/imports/csv \
        -F "file=@backend/test-data/bank-statement-sample.csv" \
        -F "account_id=test-account")
    
    if echo "$RESPONSE" | grep -q "job_id"; then
        echo -e "${GREEN}✓ CSV upload test passed${NC}"
    else
        echo -e "${RED}✗ CSV upload test failed${NC}"
        echo "Response: $RESPONSE"
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Monitor logs: ssh ${STAGING_USER}@${STAGING_HOST} 'docker-compose -f /opt/tadfuq/docker-compose.staging.yml logs -f'"
echo "2. Run full test suite: ./test-scripts/staging-test.sh"
echo "3. Check metrics: http://${STAGING_HOST}:8080/metrics"
echo "4. Review STAGING_TEST_GUIDE.md for detailed testing"
echo ""
