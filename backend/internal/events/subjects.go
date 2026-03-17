package events

// NATS JetStream subject constants for the cashflow platform.
// All subjects follow the pattern: cashflow.{domain}.{action}

const (
	// Transaction events
	SubjectTransactionsImported = "cashflow.transactions.imported"
	SubjectTransactionsFailed   = "cashflow.transactions.failed"
	
	// Analysis events
	SubjectAnalysisCompleted = "cashflow.analysis.completed"
	SubjectAnalysisFailed    = "cashflow.analysis.failed"
	
	// Forecast events
	SubjectForecastGenerated = "cashflow.forecast.generated"
	SubjectForecastFailed    = "cashflow.forecast.failed"
	
	// Vendor events
	SubjectVendorStatsUpdated = "cashflow.vendor.stats_updated"
	
	// Pattern events
	SubjectPatternsDetected = "cashflow.patterns.detected"
)

// Stream names for JetStream
const (
	StreamCashflow = "CASHFLOW"
)

// Consumer names
const (
	ConsumerTreasuryPipeline = "treasury-pipeline-worker"
	ConsumerAnalytics        = "analytics-worker"
)
