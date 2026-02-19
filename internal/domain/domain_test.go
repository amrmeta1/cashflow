package domain_test

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/domain"
)

func TestContextTenantID(t *testing.T) {
	ctx := context.Background()

	// Should return false when not set
	_, ok := domain.TenantIDFromContext(ctx)
	if ok {
		t.Fatal("expected tenant_id to not be in context")
	}

	// Should return the value when set
	id := uuid.New()
	ctx = domain.ContextWithTenantID(ctx, id)
	got, ok := domain.TenantIDFromContext(ctx)
	if !ok {
		t.Fatal("expected tenant_id to be in context")
	}
	if got != id {
		t.Fatalf("expected %s, got %s", id, got)
	}
}

func TestContextUserID(t *testing.T) {
	ctx := context.Background()

	_, ok := domain.UserIDFromContext(ctx)
	if ok {
		t.Fatal("expected user_id to not be in context")
	}

	id := uuid.New()
	ctx = domain.ContextWithUserID(ctx, id)
	got, ok := domain.UserIDFromContext(ctx)
	if !ok {
		t.Fatal("expected user_id to be in context")
	}
	if got != id {
		t.Fatalf("expected %s, got %s", id, got)
	}
}

func TestHasPermission(t *testing.T) {
	ctx := context.Background()

	// No permissions
	if domain.HasPermission(ctx, "tenant", "read") {
		t.Fatal("expected no permission")
	}

	// With permissions
	perms := []domain.Permission{
		{Resource: "tenant", Action: "read"},
		{Resource: "tenant", Action: "update"},
		{Resource: "user", Action: "read"},
	}
	ctx = domain.ContextWithPermissions(ctx, perms)

	tests := []struct {
		resource string
		action   string
		expected bool
	}{
		{"tenant", "read", true},
		{"tenant", "update", true},
		{"tenant", "delete", false},
		{"user", "read", true},
		{"user", "delete", false},
		{"role", "read", false},
	}

	for _, tc := range tests {
		got := domain.HasPermission(ctx, tc.resource, tc.action)
		if got != tc.expected {
			t.Errorf("HasPermission(%s, %s) = %v, want %v", tc.resource, tc.action, got, tc.expected)
		}
	}
}

func TestHasPermissionManageWildcard(t *testing.T) {
	ctx := context.Background()
	perms := []domain.Permission{
		{Resource: "membership", Action: "manage"},
	}
	ctx = domain.ContextWithPermissions(ctx, perms)

	// "manage" should grant any action on the resource
	if !domain.HasPermission(ctx, "membership", "create") {
		t.Fatal("expected manage to grant create")
	}
	if !domain.HasPermission(ctx, "membership", "delete") {
		t.Fatal("expected manage to grant delete")
	}
	// But not on a different resource
	if domain.HasPermission(ctx, "tenant", "create") {
		t.Fatal("expected no permission on different resource")
	}
}
