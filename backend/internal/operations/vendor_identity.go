package operations

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/models"
)

// VendorIdentityService handles vendor identity resolution
type VendorIdentityService struct {
	vendors models.VendorRepository
}

// NewVendorIdentityService creates a new vendor identity service
func NewVendorIdentityService(vendors models.VendorRepository) *VendorIdentityService {
	return &VendorIdentityService{
		vendors: vendors,
	}
}

// ResolveVendor resolves transaction text to a canonical vendor
// Returns vendor_id or creates new vendor if no match found
//
// Resolution strategy:
// 1. Use ai_vendor if available, else extract pattern from raw_text
// 2. Normalize vendor text
// 3. Try to find existing vendor by normalized name
// 4. If found, return vendor.ID
// 5. If not found, create new vendor and return ID
func (s *VendorIdentityService) ResolveVendor(
	ctx context.Context,
	tenantID uuid.UUID,
	aiVendor string,
	rawText string,
	category string,
) (uuid.UUID, error) {
	// Step 1: Determine vendor text to use
	vendorText := aiVendor
	if vendorText == "" {
		// Fallback to extracting pattern from raw_text
		vendorText = extractVendorPattern(rawText)
	}

	if vendorText == "" {
		return uuid.Nil, fmt.Errorf("cannot resolve vendor: both ai_vendor and raw_text are empty")
	}

	// Step 2: Extract clean pattern from vendor text (even if from ai_vendor)
	// This ensures consistent pattern extraction and prevents storing noisy vendor names
	cleanPattern := extractVendorPattern(vendorText)
	if cleanPattern == "" {
		cleanPattern = vendorText // Fallback to original if extraction fails
	}

	// Step 3: Normalize vendor text
	normalizedName := normalizeVendorText(cleanPattern)

	// Step 3: Try to find existing vendor
	existingVendor, err := s.vendors.FindByNormalizedName(ctx, tenantID, normalizedName)
	if err != nil {
		return uuid.Nil, fmt.Errorf("finding vendor by normalized name: %w", err)
	}

	// Step 4: If found, return existing vendor ID
	if existingVendor != nil {
		log.Debug().
			Str("tenant_id", tenantID.String()).
			Str("vendor_id", existingVendor.ID.String()).
			Str("canonical_name", existingVendor.CanonicalName).
			Str("input_text", vendorText).
			Msg("vendor identity resolved to existing vendor")

		return existingVendor.ID, nil
	}

	// Step 5: Create new vendor
	var defaultCategory *string
	if category != "" && category != "uncategorized" {
		defaultCategory = &category
	}

	input := models.CreateVendorInput{
		CanonicalName:   cleanPattern,
		VendorType:      nil, // Optional metadata for future use
		DefaultCategory: defaultCategory,
	}

	newVendor, err := s.vendors.Create(ctx, tenantID, input)
	if err != nil {
		return uuid.Nil, fmt.Errorf("creating new vendor: %w", err)
	}

	log.Info().
		Str("tenant_id", tenantID.String()).
		Str("vendor_id", newVendor.ID.String()).
		Str("canonical_name", newVendor.CanonicalName).
		Str("normalized_name", newVendor.NormalizedName).
		Msg("created new vendor identity")

	return newVendor.ID, nil
}

// normalizeVendorText normalizes vendor text for matching
// Rules: trim whitespace, lowercase, collapse multiple spaces
func normalizeVendorText(text string) string {
	text = strings.TrimSpace(text)
	text = strings.ToLower(text)
	text = strings.Join(strings.Fields(text), " ")
	return text
}

// extractVendorPattern extracts a vendor pattern from raw transaction text
// This is a simplified version - uses first 1-2 meaningful tokens
func extractVendorPattern(rawText string) string {
	// Normalize first
	text := normalizeVendorText(rawText)

	// Remove numbers and special characters, keep only letters and spaces
	var cleaned strings.Builder
	for _, r := range text {
		if (r >= 'a' && r <= 'z') || r == ' ' {
			cleaned.WriteRune(r)
		}
	}

	// Split into tokens
	tokens := strings.Fields(cleaned.String())

	// Filter out common noise words
	noiseWords := map[string]bool{
		"pos": true, "purchase": true, "payment": true, "txn": true,
		"transaction": true, "debit": true, "credit": true, "transfer": true,
		"atm": true, "withdrawal": true, "deposit": true, "fee": true,
		"charge": true, "bill": true, "online": true, "mobile": true,
	}

	var meaningfulTokens []string
	for _, token := range tokens {
		if len(token) >= 3 && !noiseWords[token] {
			meaningfulTokens = append(meaningfulTokens, token)
			if len(meaningfulTokens) >= 2 {
				break
			}
		}
	}

	// If we have meaningful tokens, use them
	if len(meaningfulTokens) > 0 {
		return strings.Join(meaningfulTokens, " ")
	}

	// Fallback: use first 1-2 tokens even if they're noise
	if len(tokens) > 0 {
		if len(tokens) == 1 {
			return tokens[0]
		}
		return strings.Join(tokens[:2], " ")
	}

	// Last resort: return normalized text
	return text
}
