#!/bin/bash
set -e

echo "🔄 Running database migrations..."

# Get database credentials
DB_ENDPOINT=$(cd ../terraform && terraform output -raw db_endpoint)
DB_HOST=$(echo $DB_ENDPOINT | cut -d: -f1)
DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id $(cd ../terraform && terraform output -raw db_password_secret_arn) \
  --region me-south-1 \
  --query 'SecretString' \
  --output text | jq -r '.password')

echo "📊 Database: $DB_HOST"

# URL encode the password
DB_PASSWORD_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$DB_PASSWORD', safe=''))")

# Build migration Docker image
echo "🔨 Building migration image..."
cd ../../backend
docker build -t cashflow-migrations -f - . <<'EOF'
FROM migrate/migrate:latest
COPY migrations /migrations
ENTRYPOINT ["migrate"]
CMD ["-help"]
EOF

# Run migrations
echo "🚀 Running migrations..."
docker run --rm \
  cashflow-migrations \
  -path=/migrations/ \
  -database "postgres://cashflow:${DB_PASSWORD_ENCODED}@${DB_HOST}:5432/cashflow?sslmode=require" \
  up

echo "✅ Migrations completed successfully!"
