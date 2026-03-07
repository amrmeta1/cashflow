#!/bin/bash
set -e

echo "🔧 Setting up Amplify Environment Variables..."

APP_ID="d1pdf5yf8mnktj"
REGION="me-south-1"

# Generate secure NEXTAUTH_SECRET
NEXTAUTH_SECRET=$(openssl rand -base64 32)

echo "Adding environment variables..."

aws amplify update-app \
  --app-id $APP_ID \
  --region $REGION \
  --environment-variables "{
    \"NEXT_PUBLIC_API_URL\":\"https://api.tadfuq.ai\",
    \"NEXT_PUBLIC_TENANT_API_URL\":\"https://api.tadfuq.ai/api/tenant\",
    \"NEXT_PUBLIC_INGESTION_API_URL\":\"https://api.tadfuq.ai/api/ingestion\",
    \"NEXT_PUBLIC_APP_NAME\":\"CashFlow.ai\",
    \"NEXT_PUBLIC_APP_URL\":\"https://d1pdf5yf8mnktj.amplifyapp.com\",
    \"NEXTAUTH_URL\":\"https://d1pdf5yf8mnktj.amplifyapp.com\",
    \"NEXTAUTH_SECRET\":\"$NEXTAUTH_SECRET\"
  }" \
  --query 'app.name' \
  --output text

echo "✅ Environment variables configured successfully!"
echo ""
echo "📝 NEXTAUTH_SECRET generated: $NEXTAUTH_SECRET"
echo "   (Save this for future reference)"
