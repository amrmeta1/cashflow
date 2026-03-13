package db

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/finch-co/cashflow/internal/ai/rag/domain"
)

type QueryRepo struct {
	pool *pgxpool.Pool
}

func NewQueryRepo(pool *pgxpool.Pool) *QueryRepo {
	return &QueryRepo{pool: pool}
}

func (r *QueryRepo) Create(ctx context.Context, input domain.CreateQueryInput) (*domain.RagQuery, error) {
	citations, err := json.Marshal(input.Citations)
	if err != nil {
		citations = []byte("null")
	}

	var query domain.RagQuery
	var citBytes []byte

	// Default status to 'completed' if not provided
	status := input.Status
	if status == "" {
		status = "completed"
	}

	err = r.pool.QueryRow(ctx,
		`INSERT INTO rag_queries (tenant_id, user_id, question, answer, citations, provider, latency_ms, tokens_used, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, tenant_id, user_id, question, answer, citations, provider, latency_ms, tokens_used, status, created_at`,
		input.TenantID, input.UserID, input.Question, input.Answer, citations, input.Provider, input.LatencyMs, input.TokensUsed, status,
	).Scan(&query.ID, &query.TenantID, &query.UserID, &query.Question, &query.Answer, &citBytes, &query.Provider, &query.LatencyMs, &query.TokensUsed, &query.Status, &query.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("creating query: %w", err)
	}
	_ = json.Unmarshal(citBytes, &query.Citations)
	return &query, nil
}

func (r *QueryRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.RagQuery, error) {
	var query domain.RagQuery
	var citBytes []byte
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, user_id, question, answer, citations, provider, latency_ms, tokens_used, status, created_at
		 FROM rag_queries WHERE id = $1 AND tenant_id = $2`,
		id, tenantID,
	).Scan(&query.ID, &query.TenantID, &query.UserID, &query.Question, &query.Answer, &citBytes, &query.Provider, &query.LatencyMs, &query.TokensUsed, &query.Status, &query.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("query not found")
	}
	if err != nil {
		return nil, fmt.Errorf("getting query: %w", err)
	}
	_ = json.Unmarshal(citBytes, &query.Citations)
	return &query, nil
}

func (r *QueryRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.RagQuery, int, error) {
	var total int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM rag_queries WHERE tenant_id = $1`,
		tenantID,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("counting queries: %w", err)
	}

	rows, err := r.pool.Query(ctx,
		`SELECT id, tenant_id, user_id, question, answer, citations, provider, latency_ms, tokens_used, status, created_at
		 FROM rag_queries WHERE tenant_id = $1
		 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		tenantID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("listing queries: %w", err)
	}
	defer rows.Close()

	var queries []domain.RagQuery
	for rows.Next() {
		var query domain.RagQuery
		var citBytes []byte
		if err := rows.Scan(&query.ID, &query.TenantID, &query.UserID, &query.Question, &query.Answer, &citBytes, &query.Provider, &query.LatencyMs, &query.TokensUsed, &query.Status, &query.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scanning query: %w", err)
		}
		_ = json.Unmarshal(citBytes, &query.Citations)
		queries = append(queries, query)
	}
	return queries, total, nil
}
