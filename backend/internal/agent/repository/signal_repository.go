package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/finch-co/cashflow/internal/agent/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SignalRepository defines persistence operations for signals
type SignalRepository interface {
	Create(ctx context.Context, input models.CreateSignalInput) (*models.Signal, error)
	UpsertSignal(ctx context.Context, input models.CreateSignalInput) (*models.Signal, error)
	ListByTenant(ctx context.Context, tenantID uuid.UUID, status string) ([]models.Signal, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*models.Signal, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
	FindActiveSignal(ctx context.Context, tenantID uuid.UUID, signalType, severity string) (*models.Signal, error)
}

type signalRepo struct {
	pool *pgxpool.Pool
}

// NewSignalRepository creates a new signal repository
func NewSignalRepository(pool *pgxpool.Pool) SignalRepository {
	return &signalRepo{pool: pool}
}

// Create inserts a new signal
func (r *signalRepo) Create(ctx context.Context, input models.CreateSignalInput) (*models.Signal, error) {
	dataJSON, err := json.Marshal(input.Data)
	if err != nil {
		return nil, fmt.Errorf("marshaling data: %w", err)
	}

	signal := &models.Signal{
		ID:          uuid.New(),
		TenantID:    input.TenantID,
		SignalType:  input.SignalType,
		Severity:    input.Severity,
		Title:       input.Title,
		Description: input.Description,
		Status:      models.StatusActive,
	}

	err = r.pool.QueryRow(ctx, `
		INSERT INTO agent_signals (id, tenant_id, signal_type, severity, title, description, data, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
		RETURNING created_at, updated_at
	`, signal.ID, signal.TenantID, signal.SignalType, signal.Severity, signal.Title, signal.Description, dataJSON, signal.Status).
		Scan(&signal.CreatedAt, &signal.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("inserting signal: %w", err)
	}

	signal.Data = input.Data
	return signal, nil
}

// UpsertSignal creates or updates a signal to prevent duplicates
func (r *signalRepo) UpsertSignal(ctx context.Context, input models.CreateSignalInput) (*models.Signal, error) {
	// Check if an active signal already exists for this type and severity
	existing, err := r.FindActiveSignal(ctx, input.TenantID, input.SignalType, input.Severity)
	if err == nil && existing != nil {
		// Signal already exists, update it
		dataJSON, err := json.Marshal(input.Data)
		if err != nil {
			return nil, fmt.Errorf("marshaling data: %w", err)
		}

		err = r.pool.QueryRow(ctx, `
			UPDATE agent_signals 
			SET title = $1, description = $2, data = $3, updated_at = now()
			WHERE id = $4
			RETURNING created_at, updated_at
		`, input.Title, input.Description, dataJSON, existing.ID).
			Scan(&existing.CreatedAt, &existing.UpdatedAt)

		if err != nil {
			return nil, fmt.Errorf("updating signal: %w", err)
		}

		existing.Title = input.Title
		existing.Description = input.Description
		existing.Data = input.Data
		return existing, nil
	}

	// No existing signal, create new one
	return r.Create(ctx, input)
}

// FindActiveSignal finds an active signal by type and severity
func (r *signalRepo) FindActiveSignal(ctx context.Context, tenantID uuid.UUID, signalType, severity string) (*models.Signal, error) {
	var signal models.Signal
	var dataJSON []byte

	err := r.pool.QueryRow(ctx, `
		SELECT id, tenant_id, signal_type, severity, title, description, data, status, created_at, updated_at
		FROM agent_signals
		WHERE tenant_id = $1 AND signal_type = $2 AND severity = $3 AND status = $4
		ORDER BY created_at DESC
		LIMIT 1
	`, tenantID, signalType, severity, models.StatusActive).
		Scan(&signal.ID, &signal.TenantID, &signal.SignalType, &signal.Severity, 
			&signal.Title, &signal.Description, &dataJSON, &signal.Status, 
			&signal.CreatedAt, &signal.UpdatedAt)

	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(dataJSON, &signal.Data); err != nil {
		return nil, fmt.Errorf("unmarshaling data: %w", err)
	}

	return &signal, nil
}

// ListByTenant retrieves all signals for a tenant, optionally filtered by status
func (r *signalRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID, status string) ([]models.Signal, error) {
	query := `
		SELECT id, tenant_id, signal_type, severity, title, description, data, status, created_at, updated_at
		FROM agent_signals
		WHERE tenant_id = $1
	`
	args := []interface{}{tenantID}

	if status != "" {
		query += " AND status = $2"
		args = append(args, status)
	}

	query += " ORDER BY created_at DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("querying signals: %w", err)
	}
	defer rows.Close()

	signals := []models.Signal{}
	for rows.Next() {
		var signal models.Signal
		var dataJSON []byte

		err := rows.Scan(&signal.ID, &signal.TenantID, &signal.SignalType, &signal.Severity,
			&signal.Title, &signal.Description, &dataJSON, &signal.Status,
			&signal.CreatedAt, &signal.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("scanning signal: %w", err)
		}

		if err := json.Unmarshal(dataJSON, &signal.Data); err != nil {
			return nil, fmt.Errorf("unmarshaling data: %w", err)
		}

		signals = append(signals, signal)
	}

	return signals, nil
}

// GetByID retrieves a signal by ID
func (r *signalRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*models.Signal, error) {
	var signal models.Signal
	var dataJSON []byte

	err := r.pool.QueryRow(ctx, `
		SELECT id, tenant_id, signal_type, severity, title, description, data, status, created_at, updated_at
		FROM agent_signals
		WHERE id = $1 AND tenant_id = $2
	`, id, tenantID).
		Scan(&signal.ID, &signal.TenantID, &signal.SignalType, &signal.Severity,
			&signal.Title, &signal.Description, &dataJSON, &signal.Status,
			&signal.CreatedAt, &signal.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("querying signal: %w", err)
	}

	if err := json.Unmarshal(dataJSON, &signal.Data); err != nil {
		return nil, fmt.Errorf("unmarshaling data: %w", err)
	}

	return &signal, nil
}

// UpdateStatus updates the status of a signal
func (r *signalRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE agent_signals
		SET status = $1, updated_at = now()
		WHERE id = $2
	`, status, id)

	if err != nil {
		return fmt.Errorf("updating signal status: %w", err)
	}

	return nil
}
