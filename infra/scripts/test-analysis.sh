#!/usr/bin/env bash
# Test Analysis API: get token, create tenant, run analysis, get latest.
# Requires: Keycloak (8180), tenant-service (8080), ingestion-service (8081), curl, jq.
#
# When tenant/ingestion run in Docker they expect token issuer http://keycloak:8180.
# So either: (1) run tenant + ingestion locally (make run, make run-ingestion) then run this script,
# or (2) run only infra in Docker: docker compose -f deploy/docker/docker-compose.yml up -d postgres keycloak nats rabbitmq

set -e
BASE_URL_TENANT="${API_BASE_URL:-http://localhost:8080}"
BASE_URL_INGEST="${INGESTION_API_BASE_URL:-http://localhost:8081}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8180}"

echo "=== 1. Get Keycloak token ==="
TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/cashflow/protocol/openid-connect/token" \
  -d "grant_type=password" \
  -d "client_id=cashflow-api" \
  -d "client_secret=cashflow-api-secret" \
  -d "username=admin@demo.com" \
  -d "password=admin123" | jq -r '.access_token')
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "FAIL: Could not get token. Is Keycloak running on $KEYCLOAK_URL?"
  exit 1
fi
echo "OK: Token obtained"

echo ""
echo "=== 2. Create tenant (to get UUID) ==="
TENANT_RESP=$(curl -s -X POST "$BASE_URL_TENANT/tenants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\": \"Test Analysis Tenant\", \"slug\": \"test-analysis-$(date +%s)\"}")
TENANT_ID=$(echo "$TENANT_RESP" | jq -r '.id // .data.id // empty')
if [ -z "$TENANT_ID" ]; then
  if echo "$TENANT_RESP" | grep -q "Unauthorized\|invalid or expired token"; then
    echo "FAIL: Token rejected. When tenant/ingestion run in Docker they expect issuer http://keycloak:8180."
    echo "  Fix: run tenant and ingestion locally so they accept localhost token:"
    echo "    docker compose -f deploy/docker/docker-compose.yml stop tenant-service ingestion-service"
    echo "    DB_PORT=5433 make run          # terminal 1"
    echo "    DB_PORT=5433 make run-ingestion # terminal 2"
    echo "  Then run this script again."
  else
    echo "Create tenant response: $TENANT_RESP"
    echo "FAIL: No tenant id. Is tenant-service running on $BASE_URL_TENANT?"
  fi
  exit 1
fi
echo "OK: Tenant ID = $TENANT_ID"

echo ""
echo "=== 3. POST /tenants/{id}/analysis/run ==="
RUN_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL_INGEST/tenants/$TENANT_ID/analysis/run" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")
RUN_HTTP=$(echo "$RUN_RESP" | tail -n1)
RUN_BODY=$(echo "$RUN_RESP" | sed '$d')
if [ "$RUN_HTTP" != "200" ]; then
  echo "FAIL: HTTP $RUN_HTTP. Body: $RUN_BODY"
  exit 1
fi
echo "OK: Analysis run returned 200"
echo "$RUN_BODY" | jq -c '{ tenant_id, analyzed_at, summary: .summary.health_score }' 2>/dev/null || echo "$RUN_BODY"

echo ""
echo "=== 4. GET /tenants/{id}/analysis/latest ==="
LATEST_RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL_INGEST/tenants/$TENANT_ID/analysis/latest" \
  -H "Authorization: Bearer $TOKEN")
LATEST_HTTP=$(echo "$LATEST_RESP" | tail -n1)
LATEST_BODY=$(echo "$LATEST_RESP" | sed '$d')
if [ "$LATEST_HTTP" != "200" ]; then
  echo "FAIL: HTTP $LATEST_HTTP. Body: $LATEST_BODY"
  exit 1
fi
echo "OK: Get latest returned 200"
echo "$LATEST_BODY" | jq -c '{ tenant_id, analyzed_at, health_score: .summary.health_score, risk_level: .summary.risk_level, runway_days: .liquidity.runway_days }' 2>/dev/null || echo "$LATEST_BODY"

echo ""
echo "=== Analysis API test passed ==="
