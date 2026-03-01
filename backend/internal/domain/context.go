package domain

import (
	"context"

	"github.com/google/uuid"
)

type contextKey string

const (
	ctxKeyTenantID    contextKey = "tenant_id"
	ctxKeyUserID      contextKey = "user_id"
	ctxKeyUserSub     contextKey = "user_sub"
	ctxKeyUserEmail   contextKey = "user_email"
	ctxKeyClientRoles contextKey = "client_roles"
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

// UserID helpers (internal DB UUID)

func ContextWithUserID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, ctxKeyUserID, id)
}

func UserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(ctxKeyUserID).(uuid.UUID)
	return id, ok
}

// UserSub helpers (Keycloak subject)

func ContextWithUserSub(ctx context.Context, sub string) context.Context {
	return context.WithValue(ctx, ctxKeyUserSub, sub)
}

func UserSubFromContext(ctx context.Context) (string, bool) {
	sub, ok := ctx.Value(ctxKeyUserSub).(string)
	return sub, ok
}

// UserEmail helpers

func ContextWithUserEmail(ctx context.Context, email string) context.Context {
	return context.WithValue(ctx, ctxKeyUserEmail, email)
}

func UserEmailFromContext(ctx context.Context) (string, bool) {
	email, ok := ctx.Value(ctxKeyUserEmail).(string)
	return email, ok
}

// Client roles helpers (Keycloak roles)

func ContextWithClientRoles(ctx context.Context, roles []string) context.Context {
	return context.WithValue(ctx, ctxKeyClientRoles, roles)
}

func ClientRolesFromContext(ctx context.Context) []string {
	roles, _ := ctx.Value(ctxKeyClientRoles).([]string)
	return roles
}
