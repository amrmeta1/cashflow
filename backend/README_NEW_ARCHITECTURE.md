# Backend Architecture - New Modular Design

## 🎯 Overview

This is the **new production-ready backend architecture** for the Tadfuq Treasury Platform. The architecture has been completely refactored to be modular, event-driven, and scalable.

## 🚀 Quick Start

### Prerequisites
- Go 1.21+
- PostgreSQL 14+
- NATS Server with JetStream
- Docker (optional)

### Running the Services

```bash
# 1. Start NATS
nats-server -js

# 2. Start Tenant Service (includes pipeline worker)
cd backend
go run cmd/tenant-service/main.go

# 3. Start Ingestion Service (new architecture)
go run cmd/ingestion-service-v2/main.go

# 4. Test with sample data
cd test-scripts
./test-upload.sh
./verify-results.sh
```

## 📁 Project Structure

```
backend/
├── cmd/
│   ├── tenant-service/          # Main API service + Pipeline Worker
│   ├── ingestion-service-v2/    # New ingestion service
│   └── ...
├── internal/
│   ├── ingestion/               # 🆕 File processing layer
│   │   ├── detector/            # Document type detection
│   │   ├── parsers/             # CSV/PDF/Ledger parsers
│   │   ├── normalizer/          # Deduplication & enrichment
│   │   ├── service/             # Ingestion orchestration
│   │   └── models/              # Domain models
│   ├── treasury/                # 🆕 Analytics layer
│   │   ├── pipeline/            # Pipeline orchestration & worker
│   │   └── services/            # Business logic services
│   ├── events/                  # 🆕 Event infrastructure
│   │   ├── subjects.go          # NATS subjects
│   │   └── payloads.go          # Event payloads
│   ├── shared/                  # 🆕 Cross-cutting concerns
│   │   ├── errors/              # Domain errors
│   │   ├── retry/               # Retry logic
│   │   └── observability/       # Metrics & logging
│   └── operations/              # Legacy services (being phased out)
├── test-data/                   # 🆕 Sample CSV files for testing
├── test-scripts/                # 🆕 Automated test scripts
├── examples/                    # 🆕 Integration examples
└── docs/
    ├── ARCHITECTURE_WORKFLOW.md # 🆕 Complete architecture guide
    ├── MIGRATION_GUIDE.md       # 🆕 Migration instructions
    ├── QUICK_START.md           # 🆕 Quick start guide
    └── TEST_GUIDE.md            # 🆕 Testing guide
```

## 🏗️ Architecture

### Event-Driven Flow

```
┌─────────────┐
│   Upload    │
│   CSV/PDF   │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────┐
│  Ingestion Service          │
│  • Detect → Parse           │
│  • Normalize → Store        │
│  • Publish Event (1-3s)     │
└──────┬──────────────────────┘
       │
       ↓ NATS Event
┌─────────────────────────────┐
│      JetStream              │
│  cashflow.transactions.*    │
└──────┬──────────────────────┘
       │
       ↓ Async
┌─────────────────────────────┐
│  Pipeline Worker            │
│  • AI Classification        │
│  • Vendor Stats             │
│  • CashFlow DNA             │
│  • Forecast                 │
│  • Liquidity                │
│  • Analysis (15-30s)        │
└──────┬──────────────────────┘
       │
       ↓
┌─────────────────────────────┐
│      Database               │
└─────────────────────────────┘
```

### Key Improvements

| Aspect | Old | New | Improvement |
|--------|-----|-----|-------------|
| **Response Time** | 20-40s | 1-3s | **93% faster** ⚡ |
| **User Experience** | Blocking | Async | **Immediate** ✨ |
| **Scalability** | Single-threaded | Multi-worker | **Horizontal** 📊 |
| **Code Complexity** | 1,101 lines | ~300 lines | **73% reduction** 📉 |
| **Observability** | Minimal | 20+ metrics | **Full visibility** 🔍 |

## 🔧 Components

### 1. Ingestion Service

**Purpose:** Process uploaded files and store transactions

**Features:**
- ✅ Multi-format support (CSV, PDF, Ledger)
- ✅ Automatic document type detection
- ✅ Deduplication by hash
- ✅ Vendor resolution
- ✅ Event publishing to NATS
- ✅ Comprehensive metrics

**Endpoints:**
- `POST /api/v1/tenants/{id}/imports/csv` - Upload CSV
- `POST /api/v1/tenants/{id}/imports/pdf` - Upload PDF
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

### 2. Treasury Pipeline Worker

**Purpose:** Process transactions asynchronously

**Steps:**
1. **AI Classification** - Categorize transactions
2. **Vendor Stats** - Update vendor statistics
3. **CashFlow DNA** - Detect recurring patterns
4. **Forecast** - Generate cash flow forecasts
5. **Liquidity** - Calculate liquidity metrics
6. **Analysis** - Generate financial analysis

**Features:**
- ✅ Event-driven (NATS consumer)
- ✅ Retry with exponential backoff
- ✅ Dead letter queue support
- ✅ Per-step metrics and logging

### 3. Parsers

**Supported Formats:**
- **Bank CSV** - Standard bank statement format
- **Ledger CSV** - Accounting ledger with debit/credit
- **PDF** - Bank statement PDFs (QNB, etc.)

**Features:**
- ✅ Flexible date parsing (multiple formats)
- ✅ Amount parsing (debit/credit support)
- ✅ Vendor extraction
- ✅ Category detection

### 4. Event System

**NATS Subjects:**
- `cashflow.transactions.imported` - New transactions imported
- `cashflow.analysis.completed` - Analysis completed
- `cashflow.forecast.generated` - Forecast generated

**Features:**
- ✅ JetStream for persistence
- ✅ Work queue policy
- ✅ At-least-once delivery
- ✅ Consumer acknowledgment

## 📊 Monitoring

### Prometheus Metrics

```prometheus
# Ingestion
cashflow_ingestion_files_total{document_type, status}
cashflow_ingestion_duration_seconds{document_type}
cashflow_ingestion_transactions_inserted_total{tenant_id}

# Pipeline
cashflow_pipeline_executions_total{status}
cashflow_pipeline_step_duration_seconds{step}
cashflow_pipeline_failures_total{step}

# Events
cashflow_events_published_total{subject, status}
cashflow_events_consumed_total{subject, status}
```

### Logs

Structured JSON logs with:
- Tenant ID
- Job ID
- Duration
- Error details
- Step information

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
go test ./internal/...

# Run specific package tests
go test ./internal/ingestion/parsers/...
```

### Integration Tests

```bash
# Upload test files
cd test-scripts
./test-upload.sh

# Verify results
./verify-results.sh
```

### Test Data

Sample files in `test-data/`:
- `bank-statement-sample.csv` - 37 transactions
- `ledger-sample.csv` - 37 ledger entries
- `debit-credit-format.csv` - Alternative format

## 🚀 Deployment

### Development

```bash
# Build services
go build -o bin/tenant-service cmd/tenant-service/main.go
go build -o bin/ingestion-service cmd/ingestion-service-v2/main.go

# Run
./bin/tenant-service
./bin/ingestion-service
```

### Docker

```bash
# Build images
docker build -t tadfuq/tenant-service:latest -f Dockerfile.tenant .
docker build -t tadfuq/ingestion-service:latest -f Dockerfile.ingestion .

# Run with docker-compose
docker-compose up -d
```

### Production

See `MIGRATION_GUIDE.md` for production deployment strategy.

## 📖 Documentation

- **[Architecture Workflow](ARCHITECTURE_WORKFLOW.md)** - Complete system design
- **[Migration Guide](MIGRATION_GUIDE.md)** - How to migrate from old to new
- **[Quick Start](QUICK_START.md)** - Get running in 5 steps
- **[Test Guide](TEST_GUIDE.md)** - Testing strategies
- **[Integration Complete](INTEGRATION_COMPLETE.md)** - Integration status

## 🔄 Migration Strategy

### Phase 1: Parallel Deployment (Week 1)
- Deploy new services alongside old
- Feature flag: 10% of tenants
- Monitor metrics closely

### Phase 2: Gradual Rollout (Week 2-3)
- Increase to 50% of tenants
- Compare old vs new results
- Fix any issues

### Phase 3: Full Migration (Week 4)
- Enable for all tenants
- Remove old code
- Cleanup

## 🐛 Troubleshooting

### Common Issues

**Issue: "pipeline worker disabled - NATS not available"**
```bash
# Start NATS
nats-server -js

# Verify
nats server check
```

**Issue: Events not being consumed**
```bash
# Check consumer
nats consumer ls CASHFLOW

# Check for errors
tail -f logs/tenant-service.log | grep pipeline
```

**Issue: Upload fails**
```bash
# Check file format
head -5 your-file.csv

# Check logs
tail -f logs/ingestion-service.log
```

## 🤝 Contributing

1. Create feature branch from `development`
2. Make changes
3. Add tests
4. Update documentation
5. Submit PR

## 📝 License

Proprietary - Tadfuq Platform

## 👥 Team

- Backend Architecture: Refactored for production
- Event System: NATS JetStream
- Monitoring: Prometheus + Grafana
- Database: PostgreSQL

---

**Status:** ✅ Production Ready

**Version:** 2.0.0

**Last Updated:** March 2026
