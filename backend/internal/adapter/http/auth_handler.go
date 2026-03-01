// Package http — auth_handler.go is intentionally empty.
// Authentication is handled by Keycloak. Users authenticate via Keycloak's
// OIDC endpoints and present JWT access tokens to this service.
// The middleware validates tokens and provisions users automatically.
package http
