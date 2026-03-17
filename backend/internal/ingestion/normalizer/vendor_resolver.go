package normalizer

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/models"
)

// VendorResolver handles vendor identification and resolution.
type VendorResolver struct {
	vendorRepo models.VendorRepository
	cache      map[string]*uuid.UUID // description -> vendor_id cache
}

// NewVendorResolver creates a new vendor resolver.
func NewVendorResolver(vendorRepo models.VendorRepository) *VendorResolver {
	return &VendorResolver{
		vendorRepo: vendorRepo,
		cache:      make(map[string]*uuid.UUID),
	}
}

// Resolve attempts to resolve a vendor from the description or explicit vendor name.
// Returns vendor ID and name if found, nil otherwise.
func (vr *VendorResolver) Resolve(ctx context.Context, description, vendorName string) (*uuid.UUID, string) {
	// If vendor name is explicitly provided, use it
	if vendorName != "" {
		return vr.resolveByName(ctx, vendorName)
	}

	// Try to extract vendor from description
	return vr.resolveByDescription(ctx, description)
}

// resolveByName looks up vendor by exact name match.
func (vr *VendorResolver) resolveByName(_ context.Context, name string) (*uuid.UUID, string) {
	if name == "" {
		return nil, ""
	}

	// Check cache first
	if vendorID, ok := vr.cache[name]; ok {
		return vendorID, name
	}

	// TODO: Query vendor repository by name
	// For now, return the name without ID
	return nil, name
}

// resolveByDescription attempts to extract and resolve vendor from transaction description.
func (vr *VendorResolver) resolveByDescription(_ context.Context, description string) (*uuid.UUID, string) {
	if description == "" {
		return nil, ""
	}

	// Clean and normalize description
	cleaned := cleanDescription(description)

	// Check cache
	if vendorID, ok := vr.cache[cleaned]; ok {
		return vendorID, cleaned
	}

	// Extract potential vendor name from description
	vendorName := extractVendorName(cleaned)
	if vendorName == "" {
		return nil, ""
	}

	// TODO: Query vendor repository for fuzzy match
	// For now, return extracted name without ID
	return nil, vendorName
}

// cleanDescription removes common noise from transaction descriptions.
func cleanDescription(desc string) string {
	// Convert to lowercase
	desc = strings.ToLower(desc)

	// Remove common prefixes
	prefixes := []string{
		"pos purchase ",
		"atm withdrawal ",
		"online transfer ",
		"payment to ",
		"transfer to ",
	}
	for _, prefix := range prefixes {
		desc = strings.TrimPrefix(desc, prefix)
	}

	// Trim whitespace
	desc = strings.TrimSpace(desc)

	return desc
}

// extractVendorName attempts to extract a vendor name from a cleaned description.
func extractVendorName(desc string) string {
	// Split by common delimiters
	parts := strings.FieldsFunc(desc, func(r rune) bool {
		return r == '-' || r == '/' || r == '*'
	})

	if len(parts) == 0 {
		return desc
	}

	// Take the first meaningful part
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if len(part) > 2 { // Ignore very short parts
			return part
		}
	}

	return desc
}

// ClearCache clears the vendor resolution cache.
func (vr *VendorResolver) ClearCache() {
	vr.cache = make(map[string]*uuid.UUID)
	log.Debug().Msg("vendor resolver cache cleared")
}

// CacheSize returns the current cache size.
func (vr *VendorResolver) CacheSize() int {
	return len(vr.cache)
}
