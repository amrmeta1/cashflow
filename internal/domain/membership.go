package domain

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

type Membership struct {
	ID        uuid.UUID        `json:"id"`
	TenantID  uuid.UUID        `json:"tenant_id"`
	UserID    uuid.UUID        `json:"user_id"`
	RoleID    uuid.UUID        `json:"role_id"`
	Status    MembershipStatus `json:"status"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`

	// Joined fields (optional, populated by queries)
	User *User `json:"user,omitempty"`
	Role *Role `json:"role,omitempty"`
}

type CreateMembershipInput struct {
	UserID uuid.UUID `json:"user_id"`
	RoleID uuid.UUID `json:"role_id"`
}
