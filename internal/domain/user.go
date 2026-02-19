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

type User struct {
	ID            uuid.UUID  `json:"id"`
	Email         string     `json:"email"`
	EmailVerified bool       `json:"email_verified"`
	PasswordHash  string     `json:"-"`
	FullName      string     `json:"full_name"`
	AvatarURL     string     `json:"avatar_url,omitempty"`
	IDPSubject    string     `json:"idp_subject,omitempty"`
	IDPIssuer     string     `json:"idp_issuer,omitempty"`
	Status        UserStatus `json:"status"`
	LastLoginAt   *time.Time `json:"last_login_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type CreateUserInput struct {
	Email      string `json:"email"`
	Password   string `json:"password,omitempty"`
	FullName   string `json:"full_name"`
	IDPSubject string `json:"idp_subject,omitempty"`
	IDPIssuer  string `json:"idp_issuer,omitempty"`
}

type UpdateUserInput struct {
	FullName  *string     `json:"full_name,omitempty"`
	AvatarURL *string     `json:"avatar_url,omitempty"`
	Status    *UserStatus `json:"status,omitempty"`
}
