package mq

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/adapter/integrations"
	"github.com/finch-co/cashflow/internal/domain"
)

// IngestionWorkerDeps holds dependencies for the ingestion command worker.
type IngestionWorkerDeps struct {
	Jobs        domain.IngestionJobRepository
	Idempotency domain.IdempotencyRepository
	Bank        integrations.BankProvider
	Accounting  integrations.AccountingProvider
}

// NewIngestionCommandHandler returns a MessageHandler for ingestion commands.
func NewIngestionCommandHandler(deps IngestionWorkerDeps) MessageHandler {
	return func(ctx context.Context, env *Envelope) error {
		tenantID, err := uuid.Parse(env.TenantID)
		if err != nil {
			return fmt.Errorf("invalid tenant_id in envelope: %w", err)
		}

		// Idempotency check
		exists, err := deps.Idempotency.Exists(ctx, tenantID, env.IdempotencyKey, env.EventType)
		if err != nil {
			return fmt.Errorf("checking idempotency: %w", err)
		}
		if exists {
			log.Info().
				Str("idempotency_key", env.IdempotencyKey).
				Str("event_type", env.EventType).
				Msg("duplicate message, skipping")
			return nil
		}

		// Dispatch by event type
		switch env.EventType {
		case RKIngestionSyncBank:
			err = handleSyncBank(ctx, env, deps)
		case RKIngestionSyncAccounting:
			err = handleSyncAccounting(ctx, env, deps)
		case RKCategorizationRun:
			err = handleCategorizationRun(ctx, env)
		case RKCashflowRecompute:
			err = handleCashflowRecompute(ctx, env)
		default:
			log.Warn().Str("event_type", env.EventType).Msg("unknown command type")
			return nil
		}

		if err != nil {
			return err
		}

		// Record idempotency key
		if idErr := deps.Idempotency.Create(ctx, tenantID, env.IdempotencyKey, env.EventType); idErr != nil {
			log.Error().Err(idErr).Msg("failed to record idempotency key")
		}

		return nil
	}
}

func handleSyncBank(ctx context.Context, env *Envelope, deps IngestionWorkerDeps) error {
	var payload struct {
		JobID string `json:"job_id"`
	}
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		return fmt.Errorf("unmarshalling sync_bank payload: %w", err)
	}

	jobID, _ := uuid.Parse(payload.JobID)
	if jobID != uuid.Nil {
		_ = deps.Jobs.UpdateStatus(ctx, jobID, domain.JobStatusRunning, "")
	}

	log.Info().
		Str("tenant_id", env.TenantID).
		Str("job_id", payload.JobID).
		Str("provider", deps.Bank.Name()).
		Msg("executing sync_bank command")

	// TODO: Call deps.Bank.FetchAccounts / FetchTransactions with real credentials
	// For now this is a stub that completes immediately

	if jobID != uuid.Nil {
		_ = deps.Jobs.UpdateStatus(ctx, jobID, domain.JobStatusCompleted, "")
	}

	return nil
}

func handleSyncAccounting(ctx context.Context, env *Envelope, deps IngestionWorkerDeps) error {
	var payload struct {
		JobID string `json:"job_id"`
	}
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		return fmt.Errorf("unmarshalling sync_accounting payload: %w", err)
	}

	jobID, _ := uuid.Parse(payload.JobID)
	if jobID != uuid.Nil {
		_ = deps.Jobs.UpdateStatus(ctx, jobID, domain.JobStatusRunning, "")
	}

	log.Info().
		Str("tenant_id", env.TenantID).
		Str("job_id", payload.JobID).
		Str("provider", deps.Accounting.Name()).
		Msg("executing sync_accounting command")

	// TODO: Call deps.Accounting.FetchInvoices / FetchBills with real credentials
	// For now this is a stub that completes immediately

	if jobID != uuid.Nil {
		_ = deps.Jobs.UpdateStatus(ctx, jobID, domain.JobStatusCompleted, "")
	}

	return nil
}

func handleCategorizationRun(_ context.Context, env *Envelope) error {
	// TODO: Implement transaction categorization logic
	log.Info().Str("tenant_id", env.TenantID).Msg("categorization.run received (stub)")
	return nil
}

func handleCashflowRecompute(_ context.Context, env *Envelope) error {
	// TODO: Implement cashflow recomputation logic
	log.Info().Str("tenant_id", env.TenantID).Msg("cashflow.recompute received (stub)")
	return nil
}
