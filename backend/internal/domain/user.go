package domain

import (
	"time"

	"github.com/google/uuid"
)

type UserStatus string

const (
	UserStatusActive   UserStatus = "active"
	UserStatusDisabled UserStatus = "disabled"
	UserStatusDeleted  UserStatus = "deleted"
)

// User represents a platform user. Identity is managed by Keycloak;
// this record stores the Keycloak subject as the primary key (sub claim).
type User struct {
	ID          uuid.UUID  `json:"id"`
	Sub         string     `json:"sub"`                    // Keycloak subject identifier
	Email       string     `json:"email"`
	FullName    string     `json:"full_name"`
	AvatarURL   string     `json:"avatar_url,omitempty"`
	Status      UserStatus `json:"status"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// UpsertUserInput is used to create or update a user from Keycloak token claims.
type UpsertUserInput struct {
	Sub      string `json:"sub"`
	Email    string `json:"email"`
	FullName string `json:"full_name"`
}

type UpdateUserInput struct {
	FullName  *string     `json:"full_name,omitempty"`
	AvatarURL *string     `json:"avatar_url,omitempty"`
	Status    *UserStatus `json:"status,omitempty"`
}
