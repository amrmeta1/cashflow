.PHONY: up down run build test lint migrate migrate-down fmt vet docker-build help

# ──────────────────────────────────────────────
# CashFlow.ai – Tenant Service
# ──────────────────────────────────────────────

DOCKER_COMPOSE = docker compose -f deploy/docker/docker-compose.yml
MIGRATE_DSN    = postgres://cashflow:cashflow@localhost:5432/cashflow?sslmode=disable
BINARY         = bin/tenant-service

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# ── Local dev ────────────────────────────────

up: ## Start all containers (postgres, keycloak, tenant-service)
	$(DOCKER_COMPOSE) up -d --build

down: ## Stop and remove all containers
	$(DOCKER_COMPOSE) down -v

up-deps: ## Start only postgres and keycloak (for local Go dev)
	$(DOCKER_COMPOSE) up -d postgres keycloak

run: ## Run tenant-service locally (requires postgres running)
	go run ./cmd/tenant-service

build: ## Build tenant-service binary
	CGO_ENABLED=0 go build -ldflags="-s -w" -o $(BINARY) ./cmd/tenant-service

# ── Database ─────────────────────────────────

migrate: ## Run database migrations
	@echo "Applying migrations..."
	@for f in migrations/*.up.sql; do \
		echo "  → $$f"; \
		psql "$(MIGRATE_DSN)" -f "$$f"; \
	done
	@echo "Done."

migrate-down: ## Rollback database migrations
	@echo "Rolling back migrations..."
	@for f in $$(ls -r migrations/*.down.sql); do \
		echo "  → $$f"; \
		psql "$(MIGRATE_DSN)" -f "$$f"; \
	done
	@echo "Done."

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

docker-build: ## Build Docker image
	docker build -t cashflow/tenant-service:latest -f deploy/docker/Dockerfile .
