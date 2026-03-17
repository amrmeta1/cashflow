package models

import (
	"time"

	"github.com/google/uuid"
)

type MembershipStatus string

const (
	MembershipStatusActive   MembershipStatus = "active"
	MembershipStatusInvited  MembershipStatus = "invited"
	MembershipStatusDisabled MembershipStatus = "disabled"
)

// Membership links a user to a tenant with a role.
// The role field stores the Keycloak client role name (e.g. "tenant_admin", "owner").
type Membership struct {
	ID        uuid.UUID        `json:"id"`
	TenantID  uuid.UUID        `json:"tenant_id"`
	UserID    uuid.UUID        `json:"user_id"`
	Role      string           `json:"role"`
	Status    MembershipStatus `json:"status"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`

	// Joined field (optional)
	User *User `json:"user,omitempty"`
}

type CreateMembershipInput struct {
	UserID uuid.UUID `json:"user_id"`
	Role   string    `json:"role"`
}
