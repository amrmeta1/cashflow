package operations

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/models"
)

// VendorLearningService handles vendor rule matching and learning
type VendorLearningService struct {
	rules models.VendorRuleRepository
}

// NewVendorLearningService creates a new vendor learning service
func NewVendorLearningService(rules models.VendorRuleRepository) *VendorLearningService {
	return &VendorLearningService{
		rules: rules,
	}
}

// ApplyRules attempts to match vendor rules against the given raw transaction text
// Returns the best matching rule or nil if no match found
func (s *VendorLearningService) ApplyRules(ctx context.Context, tenantID uuid.UUID, rawText string) (*models.RuleMatch, error) {
	if rawText == "" {
		return nil, nil
	}

	// Find all matching rules
	matches, err := s.rules.FindMatches(ctx, tenantID, rawText)
	if err != nil {
		return nil, fmt.Errorf("finding rule matches: %w", err)
	}

	// No matches found
	if len(matches) == 0 {
		return nil, nil
	}

	// Return the best match (already sorted by confidence, times_confirmed, updated_at)
	bestMatch := matches[0]

	log.Debug().
		Str("tenant_id", tenantID.String()).
		Str("rule_id", bestMatch.ID.String()).
		Str("pattern", bestMatch.Pattern).
		Str("vendor", bestMatch.VendorName).
		Str("category", bestMatch.Category).
		Float64("confidence", bestMatch.Confidence).
		Msg("vendor rule matched")

	return &models.RuleMatch{
		RuleID:     bestMatch.ID,
		VendorName: bestMatch.VendorName,
		Category:   bestMatch.Category,
		Confidence: bestMatch.Confidence,
	}, nil
}

// ApplyRulesBatch applies vendor rules to multiple transactions efficiently
// Loads all rules once and matches in memory for better performance
func (s *VendorLearningService) ApplyRulesBatch(ctx context.Context, tenantID uuid.UUID, transactions []string) (map[string]*models.RuleMatch, error) {
	// Load all active rules for this tenant once
	allRules, err := s.rules.List(ctx, tenantID, "active")
	if err != nil {
		return nil, fmt.Errorf("loading vendor rules: %w", err)
	}

	if len(allRules) == 0 {
		return make(map[string]*models.RuleMatch), nil
	}

	// Match each transaction against all rules in memory
	results := make(map[string]*models.RuleMatch)

	for _, rawText := range transactions {
		if rawText == "" {
			continue
		}

		normalizedText := normalizeText(rawText)
		var bestMatch *models.VendorRule

		// Find best matching rule
		for i := range allRules {
			rule := &allRules[i]

			// Check if rule matches (exact or contains)
			if rule.NormalizedPattern == normalizedText ||
				containsPattern(normalizedText, rule.NormalizedPattern) {

				if bestMatch == nil {
					bestMatch = rule
				} else {
					// Compare rules: confidence DESC, times_confirmed DESC, pattern length DESC
					if rule.Confidence > bestMatch.Confidence {
						bestMatch = rule
					} else if rule.Confidence == bestMatch.Confidence {
						if rule.TimesConfirmed > bestMatch.TimesConfirmed {
							bestMatch = rule
						} else if rule.TimesConfirmed == bestMatch.TimesConfirmed {
							if len(rule.Pattern) > len(bestMatch.Pattern) {
								bestMatch = rule
							}
						}
					}
				}
			}
		}

		if bestMatch != nil {
			results[rawText] = &models.RuleMatch{
				RuleID:     bestMatch.ID,
				VendorName: bestMatch.VendorName,
				Category:   bestMatch.Category,
				Confidence: bestMatch.Confidence,
			}
		}
	}

	log.Debug().
		Str("tenant_id", tenantID.String()).
		Int("total_transactions", len(transactions)).
		Int("matched", len(results)).
		Int("rules_loaded", len(allRules)).
		Msg("batch vendor rule matching completed")

	return results, nil
}

// normalizeText normalizes text for matching (shared with repository)
func normalizeText(text string) string {
	text = strings.TrimSpace(text)
	text = strings.ToLower(text)
	text = strings.Join(strings.Fields(text), " ")
	return text
}

// containsPattern checks if text contains the pattern
func containsPattern(text, pattern string) bool {
	return strings.Contains(text, pattern)
}

// CreateRuleFromCorrection creates a new vendor rule from a user correction
func (s *VendorLearningService) CreateRuleFromCorrection(ctx context.Context, tenantID uuid.UUID, pattern string, vendorName string, category string) (*models.VendorRule, error) {
	input := models.CreateVendorRuleInput{
		Pattern:    pattern,
		VendorName: vendorName,
		Category:   category,
		Confidence: 1.0,
		Source:     "user_correction",
	}

	rule, err := s.rules.Create(ctx, tenantID, input)
	if err != nil {
		return nil, fmt.Errorf("creating rule from correction: %w", err)
	}

	log.Info().
		Str("tenant_id", tenantID.String()).
		Str("rule_id", rule.ID.String()).
		Str("pattern", pattern).
		Str("vendor", vendorName).
		Str("category", category).
		Msg("created vendor rule from user correction")

	return rule, nil
}

// TrackRuleUsage increments the usage counters for a rule
// If wasEdited is false, both times_applied and times_confirmed are incremented
// If wasEdited is true, only times_applied is incremented
func (s *VendorLearningService) TrackRuleUsage(ctx context.Context, ruleID uuid.UUID, wasEdited bool) error {
	confirmed := !wasEdited

	err := s.rules.IncrementCounters(ctx, ruleID, true, confirmed)
	if err != nil {
		return fmt.Errorf("tracking rule usage: %w", err)
	}

	log.Debug().
		Str("rule_id", ruleID.String()).
		Bool("was_edited", wasEdited).
		Bool("confirmed", confirmed).
		Msg("tracked vendor rule usage")

	return nil
}

// ListRules retrieves all vendor rules for a tenant
func (s *VendorLearningService) ListRules(ctx context.Context, tenantID uuid.UUID, status string) ([]models.VendorRule, error) {
	rules, err := s.rules.List(ctx, tenantID, status)
	if err != nil {
		return nil, fmt.Errorf("listing vendor rules: %w", err)
	}
	return rules, nil
}
