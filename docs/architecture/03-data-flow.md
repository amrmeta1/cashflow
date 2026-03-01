# Data Flow

## 1. CSV Import

User uploads CSV →
Backend validates →
Stored in bank_transactions →
Forecast recalculated →
Rules engine executed →
Alerts stored

## 2. Forecast Generation

Transactions →
Pattern analysis →
13-week projection →
Confidence bands →
Stored in memory (not persisted)

## 3. Alert Evaluation

Scheduled every 6 hours →
Rules engine runs →
Alerts inserted →
Frontend fetches active alerts