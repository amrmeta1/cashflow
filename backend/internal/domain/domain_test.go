package domain_test

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/domain"
)

func TestContextTenantID(t *testing.T) {
	ctx := context.Background()

	_, ok := domain.TenantIDFromContext(ctx)
	if ok {
		t.Fatal("expected tenant_id to not be in context")
	}

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

func TestContextUserSub(t *testing.T) {
	ctx := context.Background()

	_, ok := domain.UserSubFromContext(ctx)
	if ok {
		t.Fatal("expected user_sub to not be in context")
	}

	sub := "keycloak-sub-12345"
	ctx = domain.ContextWithUserSub(ctx, sub)
	got, ok := domain.UserSubFromContext(ctx)
	if !ok {
		t.Fatal("expected user_sub to be in context")
	}
	if got != sub {
		t.Fatalf("expected %s, got %s", sub, got)
	}
}

func TestContextClientRoles(t *testing.T) {
	ctx := context.Background()

	roles := domain.ClientRolesFromContext(ctx)
	if len(roles) != 0 {
		t.Fatal("expected empty roles from empty context")
	}

	ctx = domain.ContextWithClientRoles(ctx, []string{"tenant_admin", "owner"})
	roles = domain.ClientRolesFromContext(ctx)
	if len(roles) != 2 {
		t.Fatalf("expected 2 roles, got %d", len(roles))
	}
	if roles[0] != "tenant_admin" || roles[1] != "owner" {
		t.Fatalf("unexpected roles: %v", roles)
	}
}

func TestContextUserEmail(t *testing.T) {
	ctx := context.Background()

	_, ok := domain.UserEmailFromContext(ctx)
	if ok {
		t.Fatal("expected email to not be in context")
	}

	email := "admin@demo.com"
	ctx = domain.ContextWithUserEmail(ctx, email)
	got, ok := domain.UserEmailFromContext(ctx)
	if !ok {
		t.Fatal("expected email to be in context")
	}
	if got != email {
		t.Fatalf("expected %s, got %s", email, got)
	}
}

func TestIsValidRole(t *testing.T) {
	tests := []struct {
		role  string
		valid bool
	}{
		{"tenant_admin", true},
		{"owner", true},
		{"finance_manager", true},
		{"accountant_readonly", true},
		{"group_cfo", true},
		{"treasury_director", true},
		{"financial_controller", true},
		{"ap_manager", true},
		{"ar_manager", true},
		{"bank_relationship_manager", true},
		{"auditor_readonly", true},
		{"board_member", true},
		{"super_admin", false},
		{"", false},
	}
	for _, tc := range tests {
		got := domain.IsValidRole(tc.role)
		if got != tc.valid {
			t.Errorf("IsValidRole(%q) = %v, want %v", tc.role, got, tc.valid)
		}
	}
}
