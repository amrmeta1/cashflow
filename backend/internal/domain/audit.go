package domain

import (
	"time"

	"github.com/google/uuid"
)

// Audit event action constants
const (
	AuditTenantCreated  = "tenant_created"
	AuditMemberAdded    = "member_added"
	AuditMemberRemoved  = "member_removed"
	AuditRoleChanged    = "role_changed"
	AuditAuthFailed     = "auth_failed"
	AuditTokenInvalid   = "token_invalid"
	AuditAccessDenied   = "access_denied"
	AuditTenantUpdated  = "tenant_updated"
	AuditTenantDeleted  = "tenant_deleted"
)

type AuditLog struct {
	ID         uuid.UUID      `json:"id"`
	TenantID   *uuid.UUID     `json:"tenant_id,omitempty"`
	ActorSub   string         `json:"actor_sub"`
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
	ActorSub   string         `json:"actor_sub"`
	Action     string         `json:"action"`
	EntityType string         `json:"entity_type"`
	EntityID   string         `json:"entity_id"`
	Metadata   map[string]any `json:"metadata,omitempty"`
	IPAddress  string         `json:"ip_address"`
	UserAgent  string         `json:"user_agent"`
}
