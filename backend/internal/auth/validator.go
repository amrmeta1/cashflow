package auth

import (
	"context"
	"fmt"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Claims represents the validated claims extracted from a Keycloak JWT.
type Claims struct {
	Subject     string              // Keycloak user ID (sub)
	Email       string              // User email
	TenantID    string              // Custom claim: tenant_id (optional)
	RealmRoles  []string            // realm_access.roles
	ClientRoles []string            // resource_access.<client>.roles
	RawClaims   jwt.MapClaims       // Full claims for extension
}

// Validator validates Keycloak-issued JWTs using JWKS (RS256).
type Validator struct {
	jwks     *JWKSClient
	issuer   string
	audience string
}

// NewValidator creates a JWT validator for the given Keycloak issuer.
func NewValidator(jwks *JWKSClient, issuer, audience string) *Validator {
	return &Validator{
		jwks:     jwks,
		issuer:   issuer,
		audience: audience,
	}
}

// Validate parses and validates a raw JWT string.
// Returns structured claims on success.
func (v *Validator) Validate(ctx context.Context, tokenStr string) (*Claims, error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (any, error) {
		// Ensure RS256
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		kid, ok := token.Header["kid"].(string)
		if !ok || kid == "" {
			return nil, fmt.Errorf("missing kid in token header")
		}

		return v.jwks.GetKey(ctx, kid)
	},
		jwt.WithIssuer(v.issuer),
		jwt.WithIssuedAt(),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return nil, fmt.Errorf("parsing token: %w", err)
	}

	mapClaims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	// Validate audience if configured
	if v.audience != "" {
		if !v.checkAudience(mapClaims) {
			return nil, fmt.Errorf("invalid audience")
		}
	}

	claims := &Claims{
		RawClaims: mapClaims,
	}

	// Extract standard claims
	if sub, _ := mapClaims["sub"].(string); sub != "" {
		claims.Subject = sub
	}
	if email, _ := mapClaims["email"].(string); email != "" {
		claims.Email = email
	}

	// Extract custom tenant_id claim
	if tid, _ := mapClaims["tenant_id"].(string); tid != "" {
		claims.TenantID = tid
	}

	// Extract realm roles
	if ra, ok := mapClaims["realm_access"].(map[string]any); ok {
		if roles, ok := ra["roles"].([]any); ok {
			for _, r := range roles {
				if rs, ok := r.(string); ok {
					claims.RealmRoles = append(claims.RealmRoles, rs)
				}
			}
		}
	}

	// Extract client roles (resource_access.<client>.roles)
	if ra, ok := mapClaims["resource_access"].(map[string]any); ok {
		for _, clientData := range ra {
			if cd, ok := clientData.(map[string]any); ok {
				if roles, ok := cd["roles"].([]any); ok {
					for _, r := range roles {
						if rs, ok := r.(string); ok {
							claims.ClientRoles = append(claims.ClientRoles, rs)
						}
					}
				}
			}
		}
	}

	return claims, nil
}

// HasRole checks if the claims contain a specific client or realm role.
func (c *Claims) HasRole(role string) bool {
	for _, r := range c.ClientRoles {
		if strings.EqualFold(r, role) {
			return true
		}
	}
	for _, r := range c.RealmRoles {
		if strings.EqualFold(r, role) {
			return true
		}
	}
	return false
}

// UserUUID parses the subject claim as a UUID.
func (c *Claims) UserUUID() (uuid.UUID, error) {
	return uuid.Parse(c.Subject)
}

func (v *Validator) checkAudience(claims jwt.MapClaims) bool {
	// Keycloak puts audience in "aud" (string or []string)
	switch aud := claims["aud"].(type) {
	case string:
		return aud == v.audience
	case []any:
		for _, a := range aud {
			if s, ok := a.(string); ok && s == v.audience {
				return true
			}
		}
	}

	// Also check "azp" (authorized party) which Keycloak uses for confidential clients
	if azp, ok := claims["azp"].(string); ok && azp == v.audience {
		return true
	}
	return false
}
