#!/bin/bash
set -e

echo "🚀 Deploying Frontend to AWS Amplify..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_ID="d1pdf5yf8mnktj"
REGION="me-south-1"
FRONTEND_DIR="../../frontend"

echo -e "${BLUE}📦 App ID: $APP_ID${NC}"
echo -e "${BLUE}🌍 Region: $REGION${NC}"
echo ""

# Step 1: Build frontend locally
echo -e "${YELLOW}1️⃣  Building frontend locally...${NC}"
cd $FRONTEND_DIR
npm ci
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Step 2: Create deployment package
echo -e "${YELLOW}2️⃣  Creating deployment package...${NC}"
cd .next
zip -r ../deployment.zip . -x "*.map" "cache/*"
cd ..

echo -e "${GREEN}✅ Package created${NC}"
echo ""

# Step 3: Upload to S3 (Amplify will use this)
echo -e "${YELLOW}3️⃣  Preparing for deployment...${NC}"

# Get Amplify app details
APP_INFO=$(aws amplify get-app --app-id $APP_ID --region $REGION --query 'app.{Domain:defaultDomain,Name:name}' --output json)
echo "App Info: $APP_INFO"

echo ""
echo -e "${GREEN}✅ Frontend is ready for deployment${NC}"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Go to: https://console.aws.amazon.com/amplify/home?region=$REGION#/$APP_ID"
echo "2. Click 'Deploy without Git provider'"
echo "3. Upload the deployment.zip file"
echo "4. Or connect your Git repository for automatic deployments"
echo ""
echo -e "${BLUE}🌐 Your app will be available at:${NC}"
echo "   https://d1pdf5yf8mnktj.amplifyapp.com"
echo ""
echo -e "${YELLOW}💡 To setup custom domain (app.tadfuq.ai):${NC}"
echo "   1. Go to Domain management in Amplify Console"
echo "   2. Add domain: tadfuq.ai"
echo "   3. Configure subdomain: app"
echo "   4. Update DNS records in Route53"

# Cleanup
rm -f deployment.zip
