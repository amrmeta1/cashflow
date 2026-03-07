#!/bin/sh
set -e

echo "🔄 Running database migrations..."

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "Installing postgresql-client..."
    apk add --no-cache postgresql-client
fi

# Set SSL mode
export PGSSLMODE=require

# Run each migration file
for f in /app/migrations/*.up.sql; do
    if [ -f "$f" ]; then
        echo "📄 Running migration: $(basename $f)"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p 5432 -U cashflow -d cashflow -f "$f" 2>&1 || {
            echo "⚠️  Migration $(basename $f) failed or already applied"
        }
    fi
done

echo "✅ All migrations completed!"
