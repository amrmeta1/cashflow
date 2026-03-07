#!/bin/bash
set -e

echo "🚀 Deploying Frontend to Amplify with full build..."

APP_ID="d1pdf5yf8mnktj"
REGION="me-south-1"

# Step 1: Create new deployment
echo "📦 Creating deployment..."
DEPLOYMENT=$(aws amplify create-deployment \
  --app-id $APP_ID \
  --branch-name main \
  --region $REGION \
  --output json)

JOB_ID=$(echo $DEPLOYMENT | jq -r '.jobId')
UPLOAD_URL=$(echo $DEPLOYMENT | jq -r '.zipUploadUrl')

echo "✅ Job ID: $JOB_ID"

# Step 2: Upload deployment package
echo "📤 Uploading deployment package..."
cd ../frontend
curl -X PUT "$UPLOAD_URL" \
  --upload-file deployment.zip \
  -H "Content-Type: application/zip" \
  --progress-bar

echo ""
echo "✅ Upload complete"

# Step 3: Start deployment
echo "🔨 Starting deployment..."
aws amplify start-deployment \
  --app-id $APP_ID \
  --branch-name main \
  --job-id $JOB_ID \
  --region $REGION

echo "✅ Deployment started"
echo ""
echo "⏳ Waiting for deployment to complete (this may take 5-10 minutes)..."

# Step 4: Monitor deployment
for i in {1..60}; do
  sleep 10
  STATUS=$(aws amplify get-job \
    --app-id $APP_ID \
    --branch-name main \
    --job-id $JOB_ID \
    --region $REGION \
    --query 'job.summary.status' \
    --output text)
  
  echo "Status: $STATUS"
  
  if [ "$STATUS" == "SUCCEED" ]; then
    echo ""
    echo "✅ Deployment completed successfully!"
    echo ""
    echo "🌐 Your app is now live at:"
    echo "   https://main.d1pdf5yf8mnktj.amplifyapp.com"
    exit 0
  elif [ "$STATUS" == "FAILED" ]; then
    echo ""
    echo "❌ Deployment failed"
    echo "Check logs at: https://console.aws.amazon.com/amplify/home?region=$REGION#/$APP_ID"
    exit 1
  fi
done

echo "⚠️  Deployment still in progress. Check Amplify Console for status."
