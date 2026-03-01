#!/usr/bin/env bash
# Run full CashFlow stack (Docker infra + services) and frontend.
# Use without login: set NEXT_PUBLIC_DEV_SKIP_AUTH=true in frontend/.env

set -e
cd "$(dirname "$0")/.."

echo "==> Starting Docker infra (postgres, keycloak, nats, rabbitmq)..."
docker compose -f deploy/docker/docker-compose.yml up -d postgres keycloak nats rabbitmq
echo "    For full API: in two terminals run: make run && make run-ingestion (after make migrate)"

echo "==> Waiting for Postgres (port 5433)..."
for i in $(seq 1 30); do
  if command -v nc >/dev/null 2>&1 && nc -z localhost 5433 2>/dev/null; then break; fi
  if [ "$i" -eq 30 ]; then echo "Postgres did not become ready."; exit 1; fi
  sleep 1
done
sleep 2

echo "==> Running migrations..."
make migrate

echo "==> Frontend: ensure frontend/.env exists (copy from frontend/.env.example)."
if [[ ! -f frontend/.env ]]; then
  cp frontend/.env.example frontend/.env
  echo "    Created frontend/.env. For no-login dev, NEXT_PUBLIC_DEV_SKIP_AUTH=true is set."
fi

echo "==> Starting frontend at http://localhost:3000"
cd frontend && npm run dev
