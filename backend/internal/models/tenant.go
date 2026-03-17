package models

import (
	"time"

	"github.com/google/uuid"
)

type TenantStatus string

const (
	TenantStatusActive    TenantStatus = "active"
	TenantStatusSuspended TenantStatus = "suspended"
	TenantStatusDeleted   TenantStatus = "deleted"
)

type Tenant struct {
	ID        uuid.UUID      `json:"id"`
	Name      string         `json:"name"`
	Slug      string         `json:"slug"`
	Plan      string         `json:"plan"`
	Status    TenantStatus   `json:"status"`
	Metadata  map[string]any `json:"metadata"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

type CreateTenantInput struct {
	Name     string         `json:"name"`
	Slug     string         `json:"slug"`
	Plan     string         `json:"plan,omitempty"`
	Metadata map[string]any `json:"metadata,omitempty"`
}

type UpdateTenantInput struct {
	Name     *string         `json:"name,omitempty"`
	Plan     *string         `json:"plan,omitempty"`
	Status   *TenantStatus   `json:"status,omitempty"`
	Metadata *map[string]any `json:"metadata,omitempty"`
}
