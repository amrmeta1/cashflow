#!/bin/bash

# Staging Test Script
# Comprehensive testing suite for staging environment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
STAGING_URL="${STAGING_URL:-http://staging.tadfuq.com}"
TENANT_ID="${TENANT_ID:-test-tenant-id}"
ACCOUNT_ID="${ACCOUNT_ID:-test-account-id}"
TEST_DATA_DIR="$(dirname "$0")/../test-data"

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_test() {
    echo -e "${YELLOW}Testing: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++))
}

print_failure() {
    echo -e "${RED}✗ $1${NC}"
    ((TESTS_FAILED++))
}

run_test() {
    ((TESTS_RUN++))
}

# Start testing
print_header "Staging Environment Tests"
echo "Staging URL: $STAGING_URL"
echo "Tenant ID: $TENANT_ID"
echo "Account ID: $ACCOUNT_ID"
echo ""

# Test 1: Health Checks
print_header "1. Health Checks"

print_test "Tenant Service Health"
run_test
if curl -f -s "${STAGING_URL}:8080/health" > /dev/null 2>&1; then
    print_success "Tenant service is healthy"
else
    print_failure "Tenant service health check failed"
fi

print_test "Ingestion Service Health"
run_test
if curl -f -s "${STAGING_URL}:8081/health" > /dev/null 2>&1; then
    print_success "Ingestion service is healthy"
else
    print_failure "Ingestion service health check failed"
fi

# Test 2: CSV Upload
print_header "2. CSV Upload Tests"

if [ -f "${TEST_DATA_DIR}/bank-statement-sample.csv" ]; then
    print_test "Upload bank statement CSV"
    run_test
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        "${STAGING_URL}:8081/api/v1/tenants/${TENANT_ID}/imports/csv" \
        -F "file=@${TEST_DATA_DIR}/bank-statement-sample.csv" \
        -F "account_id=${ACCOUNT_ID}")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        if echo "$BODY" | grep -q "job_id"; then
            JOB_ID=$(echo "$BODY" | jq -r '.job_id' 2>/dev/null || echo "")
            print_success "CSV upload successful (Job ID: $JOB_ID)"
            
            # Wait a bit for processing
            sleep 2
        else
            print_failure "CSV upload response missing job_id"
        fi
    else
        print_failure "CSV upload failed (HTTP $HTTP_CODE)"
        echo "Response: $BODY"
    fi
else
    print_failure "Test CSV file not found: ${TEST_DATA_DIR}/bank-statement-sample.csv"
fi

# Test 3: Ledger Upload
print_header "3. Ledger Upload Tests"

if [ -f "${TEST_DATA_DIR}/ledger-sample.csv" ]; then
    print_test "Upload ledger CSV"
    run_test
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        "${STAGING_URL}:8081/api/v1/tenants/${TENANT_ID}/imports/csv" \
        -F "file=@${TEST_DATA_DIR}/ledger-sample.csv" \
        -F "account_id=${ACCOUNT_ID}")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        print_success "Ledger upload successful"
    else
        print_failure "Ledger upload failed (HTTP $HTTP_CODE)"
    fi
else
    echo "Ledger test file not found, skipping..."
fi

# Test 4: Performance Test
print_header "4. Performance Tests"

print_test "Response time test (10 requests)"
run_test

TOTAL_TIME=0
SUCCESS_COUNT=0

for i in {1..10}; do
    START=$(date +%s%N)
    
    if curl -s -f "${STAGING_URL}:8081/health" > /dev/null 2>&1; then
        END=$(date +%s%N)
        DURATION=$((($END - $START) / 1000000))  # Convert to milliseconds
        TOTAL_TIME=$(($TOTAL_TIME + $DURATION))
        ((SUCCESS_COUNT++))
    fi
done

if [ $SUCCESS_COUNT -eq 10 ]; then
    AVG_TIME=$(($TOTAL_TIME / 10))
    if [ $AVG_TIME -lt 1000 ]; then
        print_success "Average response time: ${AVG_TIME}ms (< 1s)"
    else
        print_failure "Average response time: ${AVG_TIME}ms (> 1s)"
    fi
else
    print_failure "Some requests failed ($SUCCESS_COUNT/10 successful)"
fi

# Test 5: Metrics Endpoint
print_header "5. Metrics Tests"

print_test "Prometheus metrics available"
run_test

if curl -s "${STAGING_URL}:8081/metrics" | grep -q "cashflow_ingestion"; then
    print_success "Ingestion metrics available"
else
    print_failure "Ingestion metrics not found"
fi

if curl -s "${STAGING_URL}:8080/metrics" | grep -q "cashflow_pipeline"; then
    print_success "Pipeline metrics available"
else
    print_failure "Pipeline metrics not found"
fi

# Test 6: Error Handling
print_header "6. Error Handling Tests"

print_test "Invalid file format handling"
run_test

echo "invalid,data" > /tmp/invalid.csv
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "${STAGING_URL}:8081/api/v1/tenants/${TENANT_ID}/imports/csv" \
    -F "file=@/tmp/invalid.csv" \
    -F "account_id=${ACCOUNT_ID}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "422" ]; then
    print_success "Invalid file properly rejected"
else
    print_failure "Invalid file not properly handled (HTTP $HTTP_CODE)"
fi

rm /tmp/invalid.csv

# Test 7: Concurrent Uploads
print_header "7. Concurrent Upload Tests"

if [ -f "${TEST_DATA_DIR}/bank-statement-sample.csv" ]; then
    print_test "10 concurrent uploads"
    run_test
    
    CONCURRENT_SUCCESS=0
    
    for i in {1..10}; do
        (
            RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
                "${STAGING_URL}:8081/api/v1/tenants/${TENANT_ID}/imports/csv" \
                -F "file=@${TEST_DATA_DIR}/bank-statement-sample.csv" \
                -F "account_id=${ACCOUNT_ID}")
            
            HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
            
            if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
                echo "success" >> /tmp/concurrent_results.txt
            fi
        ) &
    done
    
    wait
    
    if [ -f /tmp/concurrent_results.txt ]; then
        CONCURRENT_SUCCESS=$(wc -l < /tmp/concurrent_results.txt)
        rm /tmp/concurrent_results.txt
    fi
    
    if [ $CONCURRENT_SUCCESS -ge 8 ]; then
        print_success "Concurrent uploads successful ($CONCURRENT_SUCCESS/10)"
    else
        print_failure "Too many concurrent upload failures ($CONCURRENT_SUCCESS/10)"
    fi
fi

# Test 8: Database Verification (if psql is available)
print_header "8. Database Verification"

if command -v psql &> /dev/null; then
    print_test "Database connectivity"
    run_test
    
    if psql -h staging-db.tadfuq.com -U postgres -d cashflow_staging -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connection successful"
        
        # Check transaction count
        TX_COUNT=$(psql -h staging-db.tadfuq.com -U postgres -d cashflow_staging -t -c \
            "SELECT COUNT(*) FROM bank_transactions WHERE tenant_id = '${TENANT_ID}';" 2>/dev/null || echo "0")
        
        echo "  Transactions in DB: $TX_COUNT"
    else
        print_failure "Database connection failed"
    fi
else
    echo "psql not available, skipping database tests"
fi

# Summary
print_header "Test Summary"

echo "Tests Run:    $TESTS_RUN"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}All Tests Passed! ✓${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Staging environment is ready for production deployment."
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}Some Tests Failed! ✗${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Please review the failures before proceeding to production."
    exit 1
fi
