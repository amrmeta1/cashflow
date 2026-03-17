# Deployment Checklist - New Architecture

## 📋 Pre-Deployment

### Code Quality
- [ ] All tests passing (unit + integration)
- [ ] Code coverage > 80%
- [ ] No linting errors
- [ ] No security vulnerabilities
- [ ] Performance benchmarks met

### Documentation
- [ ] README updated
- [ ] API documentation current
- [ ] Architecture diagrams updated
- [ ] Migration guide complete
- [ ] Changelog updated

### Database
- [ ] Migrations tested locally
- [ ] Migrations tested on staging
- [ ] Rollback scripts ready
- [ ] Backup taken
- [ ] Index performance verified

### Dependencies
- [ ] All dependencies up to date
- [ ] No deprecated packages
- [ ] Security patches applied
- [ ] go.mod and go.sum committed

### Configuration
- [ ] Environment variables documented
- [ ] Secrets rotated (if needed)
- [ ] Feature flags configured
- [ ] Rate limits configured

## 🚀 Deployment Steps

### 1. Pre-Deployment (T-24h)
- [ ] Notify team of deployment window
- [ ] Create deployment branch
- [ ] Run full test suite
- [ ] Review monitoring dashboards
- [ ] Prepare rollback plan

### 2. Staging Deployment (T-12h)
```bash
# Deploy to staging
git checkout development
git pull origin development
./scripts/deploy-staging.sh

# Verify
- [ ] Health checks pass
- [ ] Smoke tests pass
- [ ] Integration tests pass
- [ ] Performance tests pass
```

### 3. Production Deployment (T-0)

#### Phase 1: Infrastructure
```bash
# 1. Start NATS (if not running)
- [ ] NATS server running
- [ ] JetStream enabled
- [ ] Streams created
- [ ] Consumers configured

# 2. Database migrations
- [ ] Backup database
- [ ] Run migrations
- [ ] Verify schema
```

#### Phase 2: Service Deployment
```bash
# 3. Deploy Ingestion Service v2
- [ ] Build Docker image
- [ ] Push to registry
- [ ] Deploy to cluster
- [ ] Health check passes
- [ ] Metrics available

# 4. Deploy Tenant Service (with Pipeline Worker)
- [ ] Build Docker image
- [ ] Push to registry
- [ ] Deploy to cluster
- [ ] Pipeline worker starts
- [ ] Health check passes
```

#### Phase 3: Traffic Migration
```bash
# 5. Enable new architecture (gradual)
- [ ] Feature flag: 10% traffic
- [ ] Monitor for 30 minutes
- [ ] Check error rates
- [ ] Verify metrics

- [ ] Feature flag: 50% traffic
- [ ] Monitor for 1 hour
- [ ] Compare old vs new performance
- [ ] Check data consistency

- [ ] Feature flag: 100% traffic
- [ ] Monitor for 2 hours
- [ ] All metrics normal
- [ ] No errors
```

### 4. Post-Deployment Verification

#### Immediate (T+15min)
- [ ] All services healthy
- [ ] No error spikes
- [ ] Response times normal
- [ ] Database connections stable
- [ ] NATS messages flowing

#### Short-term (T+1h)
- [ ] Upload test CSV file
- [ ] Verify transactions imported
- [ ] Check NATS events published
- [ ] Verify pipeline execution
- [ ] Check analysis generated

#### Long-term (T+24h)
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Review logs for anomalies
- [ ] Verify data integrity
- [ ] User feedback positive

## 📊 Monitoring Checklist

### Metrics to Watch
```prometheus
# Ingestion Service
- [ ] cashflow_ingestion_files_total
- [ ] cashflow_ingestion_duration_seconds
- [ ] cashflow_ingestion_errors_total

# Pipeline Worker
- [ ] cashflow_pipeline_executions_total
- [ ] cashflow_pipeline_step_duration_seconds
- [ ] cashflow_pipeline_failures_total

# Events
- [ ] cashflow_events_published_total
- [ ] cashflow_events_consumed_total
- [ ] nats_jetstream_stream_messages

# System
- [ ] CPU usage < 70%
- [ ] Memory usage < 80%
- [ ] Disk I/O normal
- [ ] Network latency < 100ms
```

### Alerts to Configure
- [ ] Service down
- [ ] High error rate (> 1%)
- [ ] Slow response time (> 5s)
- [ ] Pipeline failures
- [ ] NATS connection lost
- [ ] Database connection pool exhausted

## 🔄 Rollback Plan

### Triggers for Rollback
- Error rate > 5%
- Response time > 10s
- Data corruption detected
- Critical bug discovered
- Service unavailable

### Rollback Steps
```bash
# 1. Immediate: Disable new architecture
- [ ] Feature flag: 0% traffic
- [ ] Verify old system handling load
- [ ] Monitor for stability

# 2. If needed: Rollback deployment
- [ ] Revert to previous Docker image
- [ ] Restart services
- [ ] Verify health checks

# 3. Database rollback (if needed)
- [ ] Stop all services
- [ ] Restore database backup
- [ ] Verify data integrity
- [ ] Restart services

# 4. Post-rollback
- [ ] Notify team
- [ ] Document issues
- [ ] Plan fix
- [ ] Schedule re-deployment
```

## 📝 Communication Plan

### Before Deployment
**To:** Engineering team, Product, Support  
**When:** T-24h  
**Message:**
```
Deployment scheduled for [DATE] at [TIME]
- New ingestion architecture
- Event-driven pipeline
- Expected downtime: None
- Gradual rollout with feature flags
```

### During Deployment
**To:** Engineering team  
**When:** Real-time updates  
**Channel:** Slack #deployments  
**Updates:**
- Deployment started
- Each phase completion
- Any issues encountered
- Rollout percentages

### After Deployment
**To:** All stakeholders  
**When:** T+24h  
**Message:**
```
Deployment completed successfully
- New architecture: 100% traffic
- Performance: [metrics]
- Issues: [none/resolved]
- Next steps: [monitoring/optimization]
```

## 🧪 Testing Checklist

### Functional Tests
- [ ] Upload CSV file
- [ ] Upload PDF file
- [ ] Upload ledger file
- [ ] Verify deduplication
- [ ] Check vendor resolution
- [ ] Verify AI classification
- [ ] Check forecast generation
- [ ] Verify analysis creation

### Performance Tests
- [ ] 100 concurrent uploads
- [ ] 1000 transactions/file
- [ ] Response time < 3s
- [ ] Pipeline time < 30s
- [ ] No memory leaks
- [ ] No connection leaks

### Error Handling Tests
- [ ] Invalid file format
- [ ] Corrupted CSV
- [ ] Missing required columns
- [ ] Duplicate transactions
- [ ] NATS connection failure
- [ ] Database connection failure

## 🔐 Security Checklist

### Pre-Deployment
- [ ] Security scan completed
- [ ] No critical vulnerabilities
- [ ] Dependencies updated
- [ ] Secrets rotated
- [ ] Access controls verified

### Post-Deployment
- [ ] Audit logs enabled
- [ ] Monitoring alerts active
- [ ] Backup encryption verified
- [ ] SSL certificates valid
- [ ] API authentication working

## 📈 Success Criteria

### Performance
- ✅ Upload response time: < 3s (target: 1-2s)
- ✅ Pipeline execution: < 30s (target: 15-20s)
- ✅ Error rate: < 0.1%
- ✅ Uptime: > 99.9%

### Business
- ✅ All transactions processed correctly
- ✅ No data loss
- ✅ User experience improved
- ✅ Support tickets reduced

### Technical
- ✅ Code coverage: > 80%
- ✅ All tests passing
- ✅ Monitoring complete
- ✅ Documentation updated

## 🆘 Emergency Contacts

### On-Call Rotation
- **Primary:** [Name] - [Phone]
- **Secondary:** [Name] - [Phone]
- **Database:** [DBA Name] - [Phone]
- **Infrastructure:** [DevOps Name] - [Phone]

### Escalation Path
1. On-call engineer (immediate)
2. Tech lead (15 minutes)
3. Engineering manager (30 minutes)
4. CTO (1 hour)

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Approved By:** _____________  
**Status:** [ ] Success [ ] Partial [ ] Rollback  
**Notes:** _____________
