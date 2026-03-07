#!/bin/bash
set -e

echo "🔄 Running database migrations via ECS..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get Terraform outputs
cd ../terraform
echo "📊 Getting infrastructure details..."

CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
SUBNET_1=$(terraform output -json private_subnet_ids | jq -r '.[0]')
SUBNET_2=$(terraform output -json private_subnet_ids | jq -r '.[1]')
SECURITY_GROUP=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=cashflow-dev-ecs-tasks-sg" \
  --region me-south-1 \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

echo "✅ Cluster: $CLUSTER_NAME"
echo "✅ Subnets: $SUBNET_1, $SUBNET_2"
echo "✅ Security Group: $SECURITY_GROUP"

# Check if migrations task definition exists
echo ""
echo "🔍 Checking migrations task definition..."
TASK_DEF_EXISTS=$(aws ecs describe-task-definition \
  --task-definition cashflow-dev-migrations \
  --region me-south-1 2>/dev/null || echo "not_found")

if [[ "$TASK_DEF_EXISTS" == "not_found" ]]; then
  echo -e "${YELLOW}⚠️  Migrations task definition not found. Creating it...${NC}"
  terraform apply -auto-approve -target=aws_ecs_task_definition.migrations
  echo -e "${GREEN}✅ Task definition created${NC}"
fi

# Run the migrations task
echo ""
echo "🚀 Starting migrations task..."
TASK_ARN=$(aws ecs run-task \
  --cluster "$CLUSTER_NAME" \
  --task-definition cashflow-dev-migrations \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$SECURITY_GROUP],assignPublicIp=DISABLED}" \
  --region me-south-1 \
  --query 'tasks[0].taskArn' \
  --output text)

if [ -z "$TASK_ARN" ]; then
  echo -e "${RED}❌ Failed to start migrations task${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Task started: $TASK_ARN${NC}"
TASK_ID=$(echo $TASK_ARN | awk -F/ '{print $NF}')

# Wait for task to complete
echo ""
echo "⏳ Waiting for migrations to complete..."
for i in {1..60}; do
  TASK_STATUS=$(aws ecs describe-tasks \
    --cluster "$CLUSTER_NAME" \
    --tasks "$TASK_ARN" \
    --region me-south-1 \
    --query 'tasks[0].lastStatus' \
    --output text)
  
  if [ "$TASK_STATUS" == "STOPPED" ]; then
    break
  fi
  
  echo -n "."
  sleep 2
done
echo ""

# Get task exit code
EXIT_CODE=$(aws ecs describe-tasks \
  --cluster "$CLUSTER_NAME" \
  --tasks "$TASK_ARN" \
  --region me-south-1 \
  --query 'tasks[0].containers[0].exitCode' \
  --output text)

STOP_REASON=$(aws ecs describe-tasks \
  --cluster "$CLUSTER_NAME" \
  --tasks "$TASK_ARN" \
  --region me-south-1 \
  --query 'tasks[0].stoppedReason' \
  --output text)

# Show logs
echo ""
echo "📋 Migration logs:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
aws logs tail /ecs/cashflow-dev \
  --since 5m \
  --region me-south-1 \
  --filter-pattern "migrations" 2>/dev/null | tail -30 || echo "No logs found yet"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check result
echo ""
if [ "$EXIT_CODE" == "0" ]; then
  echo -e "${GREEN}✅ Migrations completed successfully!${NC}"
  exit 0
else
  echo -e "${RED}❌ Migrations failed${NC}"
  echo "Exit Code: $EXIT_CODE"
  echo "Stop Reason: $STOP_REASON"
  echo ""
  echo "💡 Troubleshooting tips:"
  echo "  1. Check logs: aws logs tail /ecs/cashflow-dev --since 10m --region me-south-1"
  echo "  2. Verify RDS is accessible from ECS tasks"
  echo "  3. Check security group rules"
  exit 1
fi
