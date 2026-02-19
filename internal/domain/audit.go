package domain

import (
	"time"

	"github.com/google/uuid"
)

type AuditLog struct {
	ID         uuid.UUID      `json:"id"`
	TenantID   *uuid.UUID     `json:"tenant_id,omitempty"`
	ActorID    *uuid.UUID     `json:"actor_id,omitempty"`
	Action     string         `json:"action"`
	EntityType string         `json:"entity_type"`
	EntityID   string         `json:"entity_id"`
	Metadata   map[string]any `json:"metadata"`
	IPAddress  string         `json:"ip_address"`
	UserAgent  string         `json:"user_agent"`
	OccurredAt time.Time      `json:"occurred_at"`
}

type CreateAuditLogInput struct {
	TenantID   *uuid.UUID     `json:"tenant_id,omitempty"`
	ActorID    *uuid.UUID     `json:"actor_id,omitempty"`
	Action     string         `json:"action"`
	EntityType string         `json:"entity_type"`
	EntityID   string         `json:"entity_id"`
	Metadata   map[string]any `json:"metadata,omitempty"`
	IPAddress  string         `json:"ip_address"`
	UserAgent  string         `json:"user_agent"`
}
