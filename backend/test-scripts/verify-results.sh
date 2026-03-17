#!/bin/bash

# Verification Script for New Ingestion Architecture
# This script checks NATS, database, and API results

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
TENANT_ID="${TENANT_ID:-00000000-0000-0000-0000-000000000001}"
BASE_URL="http://localhost:8081"

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}Verification Report${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

# 1. Check NATS Stream
echo -e "${YELLOW}1. Checking NATS Stream...${NC}"
if command -v nats &> /dev/null; then
    if nats stream info CASHFLOW &> /dev/null; then
        echo -e "${GREEN}✓ NATS stream exists${NC}"
        
        # Get message count
        msg_count=$(nats stream info CASHFLOW -j | jq -r '.state.messages')
        echo -e "${GREEN}  Messages in stream: $msg_count${NC}"
        
        # Get consumer info
        if nats consumer info CASHFLOW treasury-pipeline-worker &> /dev/null; then
            echo -e "${GREEN}✓ Pipeline worker consumer exists${NC}"
            
            pending=$(nats consumer info CASHFLOW treasury-pipeline-worker -j | jq -r '.num_pending')
            delivered=$(nats consumer info CASHFLOW treasury-pipeline-worker -j | jq -r '.delivered.consumer_seq')
            
            echo -e "${GREEN}  Pending messages: $pending${NC}"
            echo -e "${GREEN}  Delivered messages: $delivered${NC}"
        else
            echo -e "${RED}✗ Pipeline worker consumer not found${NC}"
        fi
    else
        echo -e "${RED}✗ NATS stream not found${NC}"
        echo "  Create it with: nats stream add CASHFLOW"
    fi
else
    echo -e "${YELLOW}⚠ NATS CLI not installed (skipping NATS checks)${NC}"
    echo "  Install with: brew install nats-io/nats-tools/nats"
fi
echo ""

# 2. Check Latest Analysis
echo -e "${YELLOW}2. Checking Latest Analysis...${NC}"
analysis_response=$(curl -s "$BASE_URL/api/v1/tenants/$TENANT_ID/analysis/latest")

if echo "$analysis_response" | jq -e '.id' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Analysis found${NC}"
    
    health_score=$(echo "$analysis_response" | jq -r '.health_score')
    runway_days=$(echo "$analysis_response" | jq -r '.runway_days')
    risk_level=$(echo "$analysis_response" | jq -r '.risk_level')
    total_inflow=$(echo "$analysis_response" | jq -r '.total_inflow')
    total_outflow=$(echo "$analysis_response" | jq -r '.total_outflow')
    
    echo -e "${GREEN}  Health Score: $health_score/100${NC}"
    echo -e "${GREEN}  Runway Days: $runway_days${NC}"
    echo -e "${GREEN}  Risk Level: $risk_level${NC}"
    echo -e "${GREEN}  Total Inflow: $total_inflow SAR${NC}"
    echo -e "${GREEN}  Total Outflow: $total_outflow SAR${NC}"
else
    echo -e "${RED}✗ No analysis found${NC}"
    echo "  Response: $analysis_response"
fi
echo ""

# 3. Check Cash Position
echo -e "${YELLOW}3. Checking Cash Position...${NC}"
position_response=$(curl -s "$BASE_URL/api/v1/tenants/$TENANT_ID/cash-position")

if echo "$position_response" | jq -e '.accounts' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Cash position available${NC}"
    
    account_count=$(echo "$position_response" | jq '.accounts | length')
    echo -e "${GREEN}  Accounts: $account_count${NC}"
    
    # Show account balances
    echo "$position_response" | jq -r '.accounts[] | "  \(.name): \(.balance) \(.currency)"'
else
    echo -e "${YELLOW}⚠ Cash position not available${NC}"
fi
echo ""

# 4. Check Forecast
echo -e "${YELLOW}4. Checking Forecast...${NC}"
forecast_response=$(curl -s "$BASE_URL/api/v1/tenants/$TENANT_ID/liquidity/forecast")

if echo "$forecast_response" | jq -e '.weeks' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Forecast available${NC}"
    
    weeks=$(echo "$forecast_response" | jq '.weeks | length')
    echo -e "${GREEN}  Forecast weeks: $weeks${NC}"
    
    # Show first 3 weeks
    echo "$forecast_response" | jq -r '.weeks[:3][] | "  Week \(.week_number): \(.projected_balance) SAR"'
else
    echo -e "${YELLOW}⚠ Forecast not available${NC}"
fi
echo ""

# 5. Check Vendor Stats
echo -e "${YELLOW}5. Checking Vendor Stats...${NC}"
vendors_response=$(curl -s "$BASE_URL/api/v1/tenants/$TENANT_ID/vendors/top?limit=5")

if echo "$vendors_response" | jq -e '.[0]' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Vendor stats available${NC}"
    
    vendor_count=$(echo "$vendors_response" | jq 'length')
    echo -e "${GREEN}  Top vendors: $vendor_count${NC}"
    
    # Show top 3 vendors
    echo "$vendors_response" | jq -r '.[:3][] | "  \(.vendor_name): \(.total_spent) SAR (\(.transaction_count) txns)"'
else
    echo -e "${YELLOW}⚠ Vendor stats not available${NC}"
fi
echo ""

# 6. Check CashFlow DNA
echo -e "${YELLOW}6. Checking CashFlow DNA Patterns...${NC}"
patterns_response=$(curl -s "$BASE_URL/api/v1/tenants/$TENANT_ID/cashflow/patterns")

if echo "$patterns_response" | jq -e '.[0]' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ CashFlow patterns detected${NC}"
    
    pattern_count=$(echo "$patterns_response" | jq 'length')
    echo -e "${GREEN}  Patterns found: $pattern_count${NC}"
    
    # Show patterns
    echo "$patterns_response" | jq -r '.[] | "  \(.pattern_type): \(.vendor_name) - \(.frequency)"'
else
    echo -e "${YELLOW}⚠ No patterns detected yet${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

# Count checks
checks_passed=0
total_checks=6

[ -n "$msg_count" ] && ((checks_passed++))
[ -n "$health_score" ] && ((checks_passed++))
[ -n "$account_count" ] && ((checks_passed++))
[ -n "$weeks" ] && ((checks_passed++))
[ -n "$vendor_count" ] && ((checks_passed++))
[ -n "$pattern_count" ] && ((checks_passed++))

echo -e "Checks passed: ${GREEN}$checks_passed${NC}/$total_checks"
echo ""

if [ $checks_passed -eq $total_checks ]; then
    echo -e "${GREEN}✓ All systems operational!${NC}"
    exit 0
elif [ $checks_passed -ge 3 ]; then
    echo -e "${YELLOW}⚠ Some systems need attention${NC}"
    exit 0
else
    echo -e "${RED}✗ Multiple systems not responding${NC}"
    exit 1
fi
