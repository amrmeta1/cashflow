package models

import "errors"

var (
	ErrNotFound           = errors.New("not found")
	ErrConflict           = errors.New("already exists")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrForbidden          = errors.New("forbidden")
	ErrValidation         = errors.New("validation error")
	ErrTenantRequired     = errors.New("tenant context required")
	ErrInvalidCredentials = errors.New("invalid credentials")
)
