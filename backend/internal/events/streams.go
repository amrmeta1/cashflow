package events

import "github.com/nats-io/nats.go/jetstream"

// Stream names
const (
	StreamCashflow = "CASHFLOW"
	StreamDLQ      = "CASHFLOW_DLQ"
)

// Subject constants — all subjects live under the CASHFLOW stream.
const (
	SubjectTransactionsIngested = "cashflow.transactions.ingested"
	SubjectInvoicesSynced       = "cashflow.invoices.synced"
	SubjectForecastGenerated    = "cashflow.forecast.generated"
	SubjectAlertTriggered       = "cashflow.alert.triggered"
)

// DLQ subject mirror: failed messages land here after max retries.
const (
	SubjectDLQTransactionsIngested = "cashflow.dlq.transactions.ingested"
	SubjectDLQInvoicesSynced       = "cashflow.dlq.invoices.synced"
	SubjectDLQForecastGenerated    = "cashflow.dlq.forecast.generated"
	SubjectDLQAlertTriggered       = "cashflow.dlq.alert.triggered"
)

// AllCashflowSubjects returns the subject filter for the main stream.
func AllCashflowSubjects() []string {
	return []string{
		"cashflow.transactions.>",
		"cashflow.invoices.>",
		"cashflow.forecast.>",
		"cashflow.alert.>",
	}
}

// AllDLQSubjects returns the subject filter for the dead-letter stream.
func AllDLQSubjects() []string {
	return []string{
		"cashflow.dlq.>",
	}
}

// StreamConfigs returns the JetStream stream configurations to be provisioned at startup.
func StreamConfigs(maxDeliver int) []jetstream.StreamConfig {
	return []jetstream.StreamConfig{
		{
			Name:      StreamCashflow,
			Subjects:  AllCashflowSubjects(),
			Retention: jetstream.WorkQueuePolicy,
			Storage:   jetstream.FileStorage,
			Replicas:  1,
			MaxAge:    7 * 24 * 60 * 60 * 1e9, // 7 days in nanoseconds
			Discard:   jetstream.DiscardOld,
		},
		{
			Name:      StreamDLQ,
			Subjects:  AllDLQSubjects(),
			Retention: jetstream.LimitsPolicy,
			Storage:   jetstream.FileStorage,
			Replicas:  1,
			MaxAge:    30 * 24 * 60 * 60 * 1e9, // 30 days
			Discard:   jetstream.DiscardOld,
		},
	}
}
