.PHONY: up down run run-ingestion run-worker build build-ingestion test lint migrate migrate-down migrate-create fmt vet docker-build docker-build-ingestion gen help up-deps run-all

# ──────────────────────────────────────────────
# CashFlow.ai – Monorepo Makefile
# ──────────────────────────────────────────────

DOCKER_COMPOSE = docker compose -f infra/docker/docker-compose.yml
MIGRATE_DSN    = postgres://cashflow:cashflow@localhost:5433/cashflow?sslmode=disable
BINARY_TENANT  = bin/tenant-service
BINARY_INGEST  = bin/ingestion-service

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

# ── Local dev ────────────────────────────────

up: ## Start all containers (postgres, keycloak, nats, rabbitmq, services)
	$(DOCKER_COMPOSE) up -d --build

down: ## Stop and remove all containers
	$(DOCKER_COMPOSE) down -v

up-deps: ## Start infra only (postgres, nats, rabbitmq)
	$(DOCKER_COMPOSE) up -d postgres nats rabbitmq

run-all: ## Start full stack (Docker infra + migrate + frontend). Frontend uses DEV_SKIP_AUTH for no-login.
	@chmod +x scripts/run-all.sh 2>/dev/null; ./scripts/run-all.sh

run: ## Run tenant-service locally
	go run ./cmd/tenant-service

run-ingestion: ## Run ingestion-service locally (requires postgres + keycloak + rabbitmq)
	SERVER_PORT=8081 go run ./cmd/ingestion-service

run-worker: ## Run the example consumer worker
	go run ./cmd/worker-example

build: ## Build tenant-service binary
	CGO_ENABLED=0 go build -ldflags="-s -w" -o $(BINARY_TENANT) ./cmd/tenant-service

build-ingestion: ## Build ingestion-service binary
	CGO_ENABLED=0 go build -ldflags="-s -w" -o $(BINARY_INGEST) ./cmd/ingestion-service

build-all: build build-ingestion ## Build all service binaries

# ── Database (golang-migrate) ────────────────

migrate: ## Run all pending migrations
	migrate -path migrations -database "$(MIGRATE_DSN)" up

migrate-down: ## Roll back the last migration
	migrate -path migrations -database "$(MIGRATE_DSN)" down 1

migrate-drop: ## Drop everything (DANGER)
	migrate -path migrations -database "$(MIGRATE_DSN)" drop -f

migrate-create: ## Create a new migration (usage: make migrate-create NAME=add_foo)
	migrate create -ext sql -dir migrations -seq $(NAME)

# ── Code generation ──────────────────────────

gen: ## Run all code generators (sqlc, etc.)
	@echo "No generators configured yet."

# ── Quality ──────────────────────────────────

test: ## Run all tests
	go test -race -cover ./...

lint: ## Run golangci-lint
	golangci-lint run ./...

fmt: ## Format Go code
	gofmt -s -w .

vet: ## Run go vet
	go vet ./...

# ── Docker ───────────────────────────────────

docker-build: ## Build tenant-service Docker image
	docker build -t cashflow/tenant-service:latest -f deploy/docker/Dockerfile .

docker-build-ingestion: ## Build ingestion-service Docker image
	docker build -t cashflow/ingestion-service:latest -f deploy/docker/Dockerfile.ingestion .

docker-build-all: docker-build docker-build-ingestion ## Build all Docker images

test-analysis: ## Test analysis API. Run tenant + ingestion locally first.
	@./scripts/test-analysis.sh
