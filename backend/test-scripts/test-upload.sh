#!/bin/bash

# Test Upload Script for New Ingestion Architecture
# This script uploads test CSV files and verifies the results

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:8080"
TENANT_ID="${TENANT_ID:-00000000-0000-0000-0000-000000000001}"
ACCOUNT_ID="${ACCOUNT_ID:-$(uuidgen)}"

echo -e "${YELLOW}==================================${NC}"
echo -e "${YELLOW}Testing New Ingestion Architecture${NC}"
echo -e "${YELLOW}==================================${NC}"
echo ""
echo "Base URL: $BASE_URL"
echo "Tenant ID: $TENANT_ID"
echo "Account ID: $ACCOUNT_ID"
echo ""

# Function to upload file
upload_file() {
    local file=$1
    local endpoint=$2
    local description=$3
    
    echo -e "${YELLOW}Testing: $description${NC}"
    echo "File: $file"
    
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -F "file=@$file" \
        -F "account_id=$ACCOUNT_ID" \
        "$BASE_URL/api/v1/tenants/$TENANT_ID/imports/$endpoint")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓ Upload successful (HTTP $http_code)${NC}"
        echo "$body" | jq '.'
        
        # Extract metrics
        job_id=$(echo "$body" | jq -r '.data.job_id // .job_id')
        inserted=$(echo "$body" | jq -r '.data.transactions_inserted // .transactions_inserted')
        duration=$(echo "$body" | jq -r '.data.duration_ms // .duration_ms')
        
        echo -e "${GREEN}  Job ID: $job_id${NC}"
        echo -e "${GREEN}  Inserted: $inserted transactions${NC}"
        echo -e "${GREEN}  Duration: ${duration}ms${NC}"
    else
        echo -e "${RED}✗ Upload failed (HTTP $http_code)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
    
    echo ""
}

# Check if services are running
echo -e "${YELLOW}Checking services...${NC}"

if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}✗ Service not running at $BASE_URL${NC}"
    echo "Please start the service first:"
    echo "  cd backend && go run cmd/ingestion-service-v2/main.go"
    exit 1
fi

echo -e "${GREEN}✓ Service is running${NC}"
echo ""

# Test 1: Bank Statement Format
if [ -f "../test-data/bank-statement-sample.csv" ]; then
    upload_file "../test-data/bank-statement-sample.csv" "csv" "Bank Statement Format"
else
    echo -e "${RED}✗ Test file not found: bank-statement-sample.csv${NC}"
fi

# Wait a bit between uploads
sleep 2

# Test 2: Ledger Format
if [ -f "../test-data/ledger-sample.csv" ]; then
    upload_file "../test-data/ledger-sample.csv" "csv" "Ledger Format (Debit/Credit)"
else
    echo -e "${RED}✗ Test file not found: ledger-sample.csv${NC}"
fi

# Wait a bit between uploads
sleep 2

# Test 3: Debit/Credit Format
if [ -f "../test-data/debit-credit-format.csv" ]; then
    upload_file "../test-data/debit-credit-format.csv" "csv" "Debit/Credit Format"
else
    echo -e "${RED}✗ Test file not found: debit-credit-format.csv${NC}"
fi

echo -e "${YELLOW}==================================${NC}"
echo -e "${YELLOW}Upload Tests Complete${NC}"
echo -e "${YELLOW}==================================${NC}"
echo ""
echo "Next steps:"
echo "1. Check NATS stream: nats stream info CASHFLOW"
echo "2. Check pipeline logs: tail -f logs/tenant-service.log | grep pipeline"
echo "3. Verify analysis: curl $BASE_URL/api/v1/tenants/$TENANT_ID/analysis/latest"
echo ""
