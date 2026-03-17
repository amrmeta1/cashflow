package repositories

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/finch-co/cashflow/internal/models"
)

type VendorRuleRepo struct {
	pool *pgxpool.Pool
}

func NewVendorRuleRepo(pool *pgxpool.Pool) *VendorRuleRepo {
	return &VendorRuleRepo{pool: pool}
}

var _ models.VendorRuleRepository = (*VendorRuleRepo)(nil)

// normalizePattern normalizes a pattern for matching
// Rules: trim whitespace, lowercase, collapse multiple spaces
func normalizePattern(pattern string) string {
	pattern = strings.TrimSpace(pattern)
	pattern = strings.ToLower(pattern)
	pattern = strings.Join(strings.Fields(pattern), " ")
	return pattern
}

// extractVendorPattern extracts a clean vendor pattern from raw transaction text
// Rules:
// 1. Remove numbers
// 2. Normalize spaces
// 3. Keep first 1-2 meaningful tokens
func extractVendorPattern(rawText string) string {
	// Normalize first
	text := normalizePattern(rawText)

	// Remove all numbers and special characters, keep only letters and spaces
	var cleaned strings.Builder
	for _, r := range text {
		if (r >= 'a' && r <= 'z') || r == ' ' {
			cleaned.WriteRune(r)
		}
	}

	// Split into tokens and take first 1-2 meaningful words
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

	// If we have meaningful tokens, use them; otherwise use first 1-2 tokens
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

// Create creates a new vendor rule for a tenant
func (r *VendorRuleRepo) Create(ctx context.Context, tenantID uuid.UUID, input models.CreateVendorRuleInput) (*models.VendorRule, error) {
	// Extract clean vendor pattern from raw text
	extractedPattern := extractVendorPattern(input.Pattern)
	normalizedPattern := normalizePattern(extractedPattern)

	confidence := input.Confidence
	if confidence == 0 {
		confidence = 1.0
	}

	source := input.Source
	if source == "" {
		source = "user_correction"
	}

	rule := &models.VendorRule{
		ID:                uuid.New(),
		TenantID:          tenantID,
		Pattern:           extractedPattern,
		NormalizedPattern: normalizedPattern,
		VendorName:        input.VendorName,
		Category:          input.Category,
		Confidence:        confidence,
		Source:            source,
		TimesApplied:      0,
		TimesConfirmed:    0,
		Status:            "active",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	_, err := r.pool.Exec(ctx, `
		INSERT INTO vendor_rules (
			id, tenant_id, pattern, normalized_pattern, vendor_name, category,
			confidence, source, times_applied, times_confirmed, status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
		rule.ID, rule.TenantID, rule.Pattern, rule.NormalizedPattern, rule.VendorName,
		rule.Category, rule.Confidence, rule.Source, rule.TimesApplied, rule.TimesConfirmed,
		rule.Status, rule.CreatedAt, rule.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating vendor rule: %w", err)
	}

	return rule, nil
}

// FindMatches finds all matching vendor rules for the given normalized text
// Matching logic: exact match OR contains match
// Returns rules sorted by confidence DESC, times_confirmed DESC, updated_at DESC
func (r *VendorRuleRepo) FindMatches(ctx context.Context, tenantID uuid.UUID, normalizedText string) ([]models.VendorRule, error) {
	normalizedText = normalizePattern(normalizedText)

	rows, err := r.pool.Query(ctx, `
		SELECT 
			id, tenant_id, pattern, normalized_pattern, vendor_name, category,
			CASE 
				WHEN times_applied > 0 THEN CAST(times_confirmed AS NUMERIC) / CAST(times_applied AS NUMERIC)
				ELSE 1.0
			END as confidence,
			source, times_applied, times_confirmed, status, created_at, updated_at
		FROM vendor_rules
		WHERE tenant_id = $1
			AND status = 'active'
			AND (
				normalized_pattern = $2  -- exact match
				OR $2 LIKE '%' || normalized_pattern || '%'  -- contains match
			)
		ORDER BY 
			CASE 
				WHEN times_applied > 0 THEN CAST(times_confirmed AS NUMERIC) / CAST(times_applied AS NUMERIC)
				ELSE 1.0
			END DESC,
			times_confirmed DESC, 
			LENGTH(pattern) DESC, 
			updated_at DESC`,
		tenantID, normalizedText,
	)
	if err != nil {
		return nil, fmt.Errorf("querying vendor rules: %w", err)
	}
	defer rows.Close()

	var rules []models.VendorRule
	for rows.Next() {
		var rule models.VendorRule
		err := rows.Scan(
			&rule.ID, &rule.TenantID, &rule.Pattern, &rule.NormalizedPattern,
			&rule.VendorName, &rule.Category, &rule.Confidence, &rule.Source,
			&rule.TimesApplied, &rule.TimesConfirmed, &rule.Status,
			&rule.CreatedAt, &rule.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning vendor rule: %w", err)
		}
		rules = append(rules, rule)
	}

	return rules, nil
}

// IncrementCounters increments the usage counters for a rule
func (r *VendorRuleRepo) IncrementCounters(ctx context.Context, ruleID uuid.UUID, applied bool, confirmed bool) error {
	query := `UPDATE vendor_rules SET updated_at = NOW()`

	if applied {
		query += `, times_applied = times_applied + 1`
	}

	if confirmed {
		query += `, times_confirmed = times_confirmed + 1`
	}

	query += ` WHERE id = $1`

	_, err := r.pool.Exec(ctx, query, ruleID)
	if err != nil {
		return fmt.Errorf("incrementing rule counters: %w", err)
	}

	return nil
}

// List retrieves all vendor rules for a tenant, optionally filtered by status
func (r *VendorRuleRepo) List(ctx context.Context, tenantID uuid.UUID, status string) ([]models.VendorRule, error) {
	query := `
		SELECT 
			id, tenant_id, pattern, normalized_pattern, vendor_name, category,
			CASE 
				WHEN times_applied > 0 THEN CAST(times_confirmed AS NUMERIC) / CAST(times_applied AS NUMERIC)
				ELSE 1.0
			END as confidence,
			source, times_applied, times_confirmed, status, created_at, updated_at
		FROM vendor_rules
		WHERE tenant_id = $1`

	args := []interface{}{tenantID}

	if status != "" {
		query += ` AND status = $2`
		args = append(args, status)
	}

	query += ` ORDER BY updated_at DESC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("listing vendor rules: %w", err)
	}
	defer rows.Close()

	var rules []models.VendorRule
	for rows.Next() {
		var rule models.VendorRule
		err := rows.Scan(
			&rule.ID, &rule.TenantID, &rule.Pattern, &rule.NormalizedPattern,
			&rule.VendorName, &rule.Category, &rule.Confidence, &rule.Source,
			&rule.TimesApplied, &rule.TimesConfirmed, &rule.Status,
			&rule.CreatedAt, &rule.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning vendor rule: %w", err)
		}
		rules = append(rules, rule)
	}

	return rules, nil
}

// GetByID retrieves a specific vendor rule
func (r *VendorRuleRepo) GetByID(ctx context.Context, tenantID uuid.UUID, ruleID uuid.UUID) (*models.VendorRule, error) {
	var rule models.VendorRule
	err := r.pool.QueryRow(ctx, `
		SELECT 
			id, tenant_id, pattern, normalized_pattern, vendor_name, category,
			CASE 
				WHEN times_applied > 0 THEN CAST(times_confirmed AS NUMERIC) / CAST(times_applied AS NUMERIC)
				ELSE 1.0
			END as confidence,
			source, times_applied, times_confirmed, status, created_at, updated_at
		FROM vendor_rules
		WHERE id = $1 AND tenant_id = $2`,
		ruleID, tenantID,
	).Scan(
		&rule.ID, &rule.TenantID, &rule.Pattern, &rule.NormalizedPattern,
		&rule.VendorName, &rule.Category, &rule.Confidence, &rule.Source,
		&rule.TimesApplied, &rule.TimesConfirmed, &rule.Status,
		&rule.CreatedAt, &rule.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("getting vendor rule: %w", err)
	}

	return &rule, nil
}
