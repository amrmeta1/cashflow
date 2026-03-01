// Package domain — role.go
// RBAC roles are managed by Keycloak client roles.
// The available roles are: tenant_admin, owner, finance_manager, accountant_readonly (core 4),
// plus enterprise: group_cfo, treasury_director, financial_controller, ap_manager, ar_manager,
// bank_relationship_manager, auditor_readonly, board_member (8). Total 12 roles.
// Permission resolution is handled by internal/auth/permissions.go.
package domain

// ValidRoles lists the Keycloak client roles recognized by the platform.
var ValidRoles = []string{
	"tenant_admin",
	"owner",
	"finance_manager",
	"accountant_readonly",
	"group_cfo",
	"treasury_director",
	"financial_controller",
	"ap_manager",
	"ar_manager",
	"bank_relationship_manager",
	"auditor_readonly",
	"board_member",
}

// IsValidRole checks whether a role string is a recognized Keycloak client role.
func IsValidRole(role string) bool {
	for _, r := range ValidRoles {
		if r == role {
			return true
		}
	}
	return false
}
