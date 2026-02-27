#!/bin/bash

# ============================================
# CashFlow.ai — Analysis API Test Script
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CashFlow.ai — Analysis API Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ── Config ──────────────────────────────────
KEYCLOAK_URL="http://localhost:8180"
API_URL="http://localhost:8081"
REALM="cashflow"
CLIENT_ID="cashflow-api"
USERNAME="admin@demo.com"
PASSWORD="admin123"
CSV_FILE="khaled_bank_2025.csv"

# ── Check jq ────────────────────────────────
if ! command -v jq &> /dev/null; then
  echo -e "${RED}❌ jq غير مثبت. شغّل: brew install jq${NC}"
  exit 1
fi

# ── Check CSV file ───────────────────────────
if [ ! -f "$CSV_FILE" ]; then
  echo -e "${RED}❌ الملف $CSV_FILE مش موجود في نفس المجلد${NC}"
  echo -e "${YELLOW}   حمّله من الـ outputs وحطه في نفس مجلد الـ script${NC}"
  exit 1
fi

echo -e "${YELLOW}▶ الخطوة 1: الحصول على Token...${NC}"
TOKEN=$(curl -s -X POST \
  "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
  -d "client_id=$CLIENT_ID&username=$USERNAME&password=$PASSWORD&grant_type=password" \
  | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ فشل الحصول على Token${NC}"
  echo -e "${YELLOW}   تأكد إن Keycloak شغال: docker compose ps${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Token جاهز${NC}"
echo ""

# ── Get or create tenant ─────────────────────
echo -e "${YELLOW}▶ الخطوة 2: الحصول على Tenant ID...${NC}"

# محاولة الحصول على tenant موجود
TENANT_RESPONSE=$(curl -s \
  "$API_URL/tenants" \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "")

# استخراج أول tenant
TENANT_ID=$(echo "$TENANT_RESPONSE" | jq -r '.[0].id // empty' 2>/dev/null || echo "")

# لو مفيش tenant، أنشئ واحد
if [ -z "$TENANT_ID" ] || [ "$TENANT_ID" = "null" ]; then
  echo -e "${YELLOW}   مفيش tenant موجود — بنشئ واحد جديد...${NC}"
  CREATE_RESPONSE=$(curl -s -X POST "$API_URL/tenants" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name": "مجموعة الخليج", "slug": "khaleej-group"}')
  TENANT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id')
fi

if [ -z "$TENANT_ID" ] || [ "$TENANT_ID" = "null" ]; then
  echo -e "${RED}❌ فشل الحصول على Tenant ID${NC}"
  echo -e "${YELLOW}   Response: $TENANT_RESPONSE${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Tenant ID: $TENANT_ID${NC}"
echo ""

# ── Upload CSV ───────────────────────────────
echo -e "${YELLOW}▶ الخطوة 3: رفع الـ CSV...${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST \
  "$API_URL/tenants/$TENANT_ID/imports/bank-csv" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$CSV_FILE")

INSERTED=$(echo "$UPLOAD_RESPONSE" | jq -r '.inserted // .count // "unknown"' 2>/dev/null || echo "unknown")
echo -e "${GREEN}✅ تم رفع الـ CSV — معاملات: $INSERTED${NC}"
echo ""

# ── Trigger analysis manually ────────────────
echo -e "${YELLOW}▶ الخطوة 4: تشغيل التحليل...${NC}"
ANALYSIS_RESPONSE=$(curl -s -X POST \
  "$API_URL/tenants/$TENANT_ID/analysis/run" \
  -H "Authorization: Bearer $TOKEN")

HEALTH=$(echo "$ANALYSIS_RESPONSE" | jq -r '.summary.health_score // empty' 2>/dev/null || echo "")

if [ -z "$HEALTH" ]; then
  echo -e "${RED}❌ فشل التحليل${NC}"
  echo -e "${YELLOW}   Response:${NC}"
  echo "$ANALYSIS_RESPONSE" | jq . 2>/dev/null || echo "$ANALYSIS_RESPONSE"
  exit 1
fi
echo -e "${GREEN}✅ التحليل اكتمل${NC}"
echo ""

# ── Wait and fetch latest ────────────────────
echo -e "${YELLOW}▶ الخطوة 5: جلب آخر تحليل...${NC}"
sleep 2

LATEST=$(curl -s \
  "$API_URL/tenants/$TENANT_ID/analysis/latest" \
  -H "Authorization: Bearer $TOKEN")

# ── Print Results ────────────────────────────
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  نتائج التحليل${NC}"
echo -e "${BLUE}========================================${NC}"

SCORE=$(echo "$LATEST" | jq -r '.summary.health_score')
RISK=$(echo "$LATEST" | jq -r '.summary.risk_level')
RUNWAY=$(echo "$LATEST" | jq -r '.summary.runway_days')
PROBLEMS=$(echo "$LATEST" | jq -r '.summary.total_problems')
TX_COUNT=$(echo "$LATEST" | jq -r '.transaction_count')

echo ""
echo -e "📊 الصحة المالية:    ${GREEN}$SCORE / 100${NC}"
echo -e "⚠️  مستوى الخطر:     $RISK"
echo -e "📅 الرصيد يكفي:     $RUNWAY يوم"
echo -e "🔴 المشاكل المكتشفة: $PROBLEMS"
echo -e "📄 عدد المعاملات:   $TX_COUNT"
echo ""

echo -e "${BLUE}── التوصيات ──${NC}"
echo "$LATEST" | jq -r '.recommendations[] | "[\(.priority)] \(.title): \(.action)"'

echo ""
echo -e "${BLUE}── توزيع المصاريف ──${NC}"
echo "$LATEST" | jq -r '.expense_breakdown[] | "\(.category): \(.percentage)% (\(.amount) QAR)"'

echo ""

# ── Final verdict ────────────────────────────
if echo "$LATEST" | jq -e '.summary.health_score' > /dev/null 2>&1; then
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}  ✅ Phase 2 نجحت! جاهز لـ Phase 3${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""
  echo -e "${YELLOW}Tenant ID للاستخدام في الـ frontend:${NC}"
  echo -e "${GREEN}$TENANT_ID${NC}"
  echo ""
  echo "TENANT_ID=$TENANT_ID" > .env.test
  echo -e "${YELLOW}تم حفظ الـ TENANT_ID في ملف .env.test${NC}"
else
  echo -e "${RED}❌ في مشكلة — شوف الـ response:${NC}"
  echo "$LATEST" | jq .
fi
