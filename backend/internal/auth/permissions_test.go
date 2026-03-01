package auth_test

import (
	"testing"

	"github.com/finch-co/cashflow/internal/auth"
)

func TestResolvePermissions_NewRoles(t *testing.T) {
	enterpriseRoles := []string{
		"group_cfo",
		"treasury_director",
		"financial_controller",
		"ap_manager",
		"ar_manager",
		"bank_relationship_manager",
		"auditor_readonly",
		"board_member",
	}
	for _, role := range enterpriseRoles {
		perms := auth.ResolvePermissions([]string{role})
		if len(perms) == 0 {
			t.Errorf("ResolvePermissions([%q]) returned empty; expected non-empty", role)
		}
	}
}

func TestResolvePermissions_BoardMember_HasReportExecutive(t *testing.T) {
	perms := auth.ResolvePermissions([]string{"board_member"})
	if !auth.HasPermission(perms, auth.PermReportExecutive) {
		t.Error("board_member expected to have PermReportExecutive")
	}
}

func TestResolvePermissions_GroupCFO_HasTreasuryAndNewPerms(t *testing.T) {
	perms := auth.ResolvePermissions([]string{"group_cfo"})
	for _, p := range []auth.Permission{
		auth.PermTreasuryRead,
		auth.PermTreasuryWrite,
		auth.PermFXRead,
		auth.PermReportExecutive,
	} {
		if !auth.HasPermission(perms, p) {
			t.Errorf("group_cfo expected to have %s", p)
		}
	}
}
