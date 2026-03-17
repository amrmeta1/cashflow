package repositories

import (
"github.com/finch-co/cashflow/internal/models"
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuditLogRepo struct {
	pool *pgxpool.Pool
}

func NewAuditLogRepo(pool *pgxpool.Pool) *AuditLogRepo {
	return &AuditLogRepo{pool: pool}
}

func (r *AuditLogRepo) Create(ctx context.Context, input models.CreateAuditLogInput) error {
	meta, err := json.Marshal(input.Metadata)
	if err != nil {
		meta = []byte("{}")
	}

	_, err = r.pool.Exec(ctx,
		`INSERT INTO audit_logs (tenant_id, actor_sub, action, entity_type, entity_id, metadata, ip_address, user_agent)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		input.TenantID, input.ActorSub, input.Action, input.EntityType, input.EntityID, meta, input.IPAddress, input.UserAgent,
	)
	if err != nil {
		return fmt.Errorf("creating audit log: %w", err)
	}
	return nil
}

func (r *AuditLogRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]models.AuditLog, int, error) {
	var total int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM audit_logs WHERE tenant_id = $1`, tenantID,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("counting audit logs: %w", err)
	}

	rows, err := r.pool.Query(ctx,
		`SELECT id, tenant_id, actor_sub, action, entity_type, entity_id, metadata, ip_address, user_agent, occurred_at
		 FROM audit_logs WHERE tenant_id = $1
		 ORDER BY occurred_at DESC LIMIT $2 OFFSET $3`, tenantID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("listing audit logs: %w", err)
	}
	defer rows.Close()

	var logs []models.AuditLog
	for rows.Next() {
		var l models.AuditLog
		var metaBytes []byte
		if err := rows.Scan(&l.ID, &l.TenantID, &l.ActorSub, &l.Action, &l.EntityType, &l.EntityID, &metaBytes, &l.IPAddress, &l.UserAgent, &l.OccurredAt); err != nil {
			return nil, 0, fmt.Errorf("scanning audit log: %w", err)
		}
		_ = json.Unmarshal(metaBytes, &l.Metadata)
		logs = append(logs, l)
	}
	return logs, total, nil
}
