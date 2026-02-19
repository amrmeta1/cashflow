package domain

import (
	"context"

	"github.com/google/uuid"
)

type contextKey string

const (
	ctxKeyTenantID contextKey = "tenant_id"
	ctxKeyUserID   contextKey = "user_id"
	ctxKeyUserEmail contextKey = "user_email"
	ctxKeyPermissions contextKey = "permissions"
)

// TenantID helpers

func ContextWithTenantID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, ctxKeyTenantID, id)
}

func TenantIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(ctxKeyTenantID).(uuid.UUID)
	return id, ok
}

func MustTenantIDFromContext(ctx context.Context) uuid.UUID {
	id, ok := TenantIDFromContext(ctx)
	if !ok {
		panic("tenant_id not in context")
	}
	return id
}

// UserID helpers

func ContextWithUserID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, ctxKeyUserID, id)
}

func UserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(ctxKeyUserID).(uuid.UUID)
	return id, ok
}

// UserEmail helpers

func ContextWithUserEmail(ctx context.Context, email string) context.Context {
	return context.WithValue(ctx, ctxKeyUserEmail, email)
}

func UserEmailFromContext(ctx context.Context) (string, bool) {
	email, ok := ctx.Value(ctxKeyUserEmail).(string)
	return email, ok
}

// Permissions helpers

func ContextWithPermissions(ctx context.Context, perms []Permission) context.Context {
	return context.WithValue(ctx, ctxKeyPermissions, perms)
}

func PermissionsFromContext(ctx context.Context) []Permission {
	perms, _ := ctx.Value(ctxKeyPermissions).([]Permission)
	return perms
}

func HasPermission(ctx context.Context, resource, action string) bool {
	for _, p := range PermissionsFromContext(ctx) {
		if p.Resource == resource && (p.Action == action || p.Action == "manage") {
			return true
		}
	}
	return false
}
