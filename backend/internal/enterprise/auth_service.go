// Package usecase — auth.go is intentionally minimal.
// Authentication is handled by Keycloak. The Go service only validates
// Keycloak-issued JWTs via the /internal/auth package and middleware.
// This file is reserved for future auth-related business logic
// (e.g. token exchange, service-to-service auth).
package enterprise
