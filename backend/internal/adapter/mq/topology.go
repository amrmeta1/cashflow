package mq

import (
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

// Exchange names
const (
	ExchangeEvents   = "cashflow.events"
	ExchangeCommands = "cashflow.commands"
	ExchangeRetry    = "cashflow.retry"
)

// Routing keys
const (
	RKTransactionsIngested = "transactions.ingested"
	RKInvoicesSynced       = "invoices.synced"
	RKBillsSynced          = "bills.synced"

	RKIngestionSyncBank       = "ingestion.sync_bank"
	RKIngestionSyncAccounting = "ingestion.sync_accounting"
	RKCategorizationRun       = "categorization.run"
	RKCashflowRecompute       = "cashflow.recompute"

	// Analysis events
	RKAnalysisRequested = "cashflow.analysis.requested"
	RKAnalysisCompleted = "cashflow.analysis.completed"
)

// Event type constants (for envelope EventType and routing)
const (
	EventAnalysisRequested = "cashflow.analysis.requested"
	EventAnalysisCompleted = "cashflow.analysis.completed"
)

// Queue names
const (
	QueueTransactionsIngested = "q.cashflow.transactions.ingested"
	QueueCommandsIngestion    = "q.cashflow.commands.ingestion"
	QueueAnalysisRequested    = "q.cashflow.analysis.requested"
	QueueRetry5s              = "q.cashflow.retry.5s"
	QueueRetry30s             = "q.cashflow.retry.30s"
	QueueDLQ                  = "q.cashflow.dlq"
)

// DeclareTopology sets up all exchanges, queues, and bindings.
func DeclareTopology(ch *amqp.Channel, retryTTL5s, retryTTL30s int) error {
	// ── Exchanges ────────────────────────────────
	exchanges := []struct {
		name string
		kind string
	}{
		{ExchangeEvents, "topic"},
		{ExchangeCommands, "direct"},
		{ExchangeRetry, "direct"},
	}
	for _, ex := range exchanges {
		if err := ch.ExchangeDeclare(ex.name, ex.kind, true, false, false, false, nil); err != nil {
			return fmt.Errorf("declaring exchange %s: %w", ex.name, err)
		}
	}

	// ── DLQ ──────────────────────────────────────
	if _, err := ch.QueueDeclare(QueueDLQ, true, false, false, false, nil); err != nil {
		return fmt.Errorf("declaring DLQ: %w", err)
	}

	// ── Retry queues (TTL → re-route to commands) ─
	retry5sArgs := amqp.Table{
		"x-dead-letter-exchange":    ExchangeCommands,
		"x-message-ttl":            int64(retryTTL5s),
	}
	if _, err := ch.QueueDeclare(QueueRetry5s, true, false, false, false, retry5sArgs); err != nil {
		return fmt.Errorf("declaring retry-5s queue: %w", err)
	}

	retry30sArgs := amqp.Table{
		"x-dead-letter-exchange":    ExchangeCommands,
		"x-message-ttl":            int64(retryTTL30s),
	}
	if _, err := ch.QueueDeclare(QueueRetry30s, true, false, false, false, retry30sArgs); err != nil {
		return fmt.Errorf("declaring retry-30s queue: %w", err)
	}

	// Bind retry queues to retry exchange
	if err := ch.QueueBind(QueueRetry5s, "retry.5s", ExchangeRetry, false, nil); err != nil {
		return fmt.Errorf("binding retry-5s: %w", err)
	}
	if err := ch.QueueBind(QueueRetry30s, "retry.30s", ExchangeRetry, false, nil); err != nil {
		return fmt.Errorf("binding retry-30s: %w", err)
	}

	// ── Event queues ─────────────────────────────
	txnQueueArgs := amqp.Table{
		"x-dead-letter-exchange":    ExchangeRetry,
		"x-dead-letter-routing-key": "retry.5s",
	}
	if _, err := ch.QueueDeclare(QueueTransactionsIngested, true, false, false, false, txnQueueArgs); err != nil {
		return fmt.Errorf("declaring transactions.ingested queue: %w", err)
	}
	if err := ch.QueueBind(QueueTransactionsIngested, RKTransactionsIngested, ExchangeEvents, false, nil); err != nil {
		return fmt.Errorf("binding transactions.ingested: %w", err)
	}
	if _, err := ch.QueueDeclare(QueueAnalysisRequested, true, false, false, false, txnQueueArgs); err != nil {
		return fmt.Errorf("declaring analysis.requested queue: %w", err)
	}
	if err := ch.QueueBind(QueueAnalysisRequested, RKAnalysisRequested, ExchangeEvents, false, nil); err != nil {
		return fmt.Errorf("binding analysis.requested: %w", err)
	}

	// ── Command queues ───────────────────────────
	cmdQueueArgs := amqp.Table{
		"x-dead-letter-exchange":    ExchangeRetry,
		"x-dead-letter-routing-key": "retry.5s",
	}
	if _, err := ch.QueueDeclare(QueueCommandsIngestion, true, false, false, false, cmdQueueArgs); err != nil {
		return fmt.Errorf("declaring commands.ingestion queue: %w", err)
	}
	// Bind command routing keys
	commandKeys := []string{
		RKIngestionSyncBank,
		RKIngestionSyncAccounting,
		RKCategorizationRun,
		RKCashflowRecompute,
	}
	for _, rk := range commandKeys {
		if err := ch.QueueBind(QueueCommandsIngestion, rk, ExchangeCommands, false, nil); err != nil {
			return fmt.Errorf("binding command %s: %w", rk, err)
		}
	}

	return nil
}
