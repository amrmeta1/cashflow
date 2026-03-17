package operations

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/models"
)

// CashFlowDNAService detects recurring financial patterns
type CashFlowDNAService struct {
	patternRepo models.CashFlowPatternRepository
	txnRepo     models.BankTransactionRepository
}

// NewCashFlowDNAService creates a new Cash Flow DNA service
func NewCashFlowDNAService(patternRepo models.CashFlowPatternRepository, txnRepo models.BankTransactionRepository) *CashFlowDNAService {
	return &CashFlowDNAService{
		patternRepo: patternRepo,
		txnRepo:     txnRepo,
	}
}

// AnalyzePatterns is the main entry point for pattern detection
func (s *CashFlowDNAService) AnalyzePatterns(ctx context.Context, tenantID uuid.UUID) error {
	log.Info().Str("tenant_id", tenantID.String()).Msg("starting Cash Flow DNA analysis")

	// Get last 120 days of transactions
	to := time.Now()
	from := to.AddDate(0, 0, -120)
	
	filter := models.TransactionFilter{
		TenantID: tenantID,
		From:     &from,
		To:       &to,
		Limit:    10000,
	}

	transactions, _, err := s.txnRepo.List(ctx, filter)
	if err != nil {
		return fmt.Errorf("fetching transactions: %w", err)
	}

	if len(transactions) < 2 {
		log.Info().Str("tenant_id", tenantID.String()).Msg("insufficient transactions for pattern detection")
		return nil
	}

	// Run pattern detection algorithms
	if err := s.DetectRecurringVendorPayments(ctx, tenantID, transactions); err != nil {
		log.Error().Err(err).Msg("recurring vendor detection failed")
	}

	if err := s.DetectPayrollCycles(ctx, tenantID, transactions); err != nil {
		log.Error().Err(err).Msg("payroll detection failed")
	}

	if err := s.DetectSubscriptions(ctx, tenantID, transactions); err != nil {
		log.Error().Err(err).Msg("subscription detection failed")
	}

	if err := s.CalculateBurnRate(ctx, tenantID); err != nil {
		log.Error().Err(err).Msg("burn rate calculation failed")
	}

	// Clean up stale patterns (not detected in last 90 days)
	staleThreshold := time.Now().AddDate(0, 0, -90)
	if err := s.patternRepo.DeleteStalePatterns(ctx, tenantID, staleThreshold); err != nil {
		log.Error().Err(err).Msg("cleaning stale patterns failed")
	}

	log.Info().Str("tenant_id", tenantID.String()).Msg("Cash Flow DNA analysis completed")
	return nil
}

// DetectRecurringVendorPayments finds recurring vendor payment patterns
func (s *CashFlowDNAService) DetectRecurringVendorPayments(ctx context.Context, tenantID uuid.UUID, transactions []models.BankTransaction) error {
	// Group transactions by vendor_id
	vendorGroups := s.groupTransactionsByVendor(transactions)

	for vendorID, txns := range vendorGroups {
		// Skip if no vendor_id or insufficient transactions
		if vendorID == uuid.Nil || len(txns) < 3 {
			continue
		}

		// Only analyze outflows (negative amounts)
		outflows := filterOutflows(txns)
		if len(outflows) < 3 {
			continue
		}

		// Analyze frequency
		frequency, intervals := s.analyzeFrequency(outflows)
		if frequency == "" {
			continue
		}

		// Calculate statistics
		amounts := extractAmounts(outflows)
		avgAmount := average(amounts)
		variance := standardDeviation(amounts) / math.Abs(avgAmount) * 100

		// Calculate confidence
		confidence := s.calculateConfidence(intervals, amounts, len(outflows))

		// Only save patterns with reasonable confidence
		if confidence < 50 {
			continue
		}

		// Predict next occurrence
		lastDate := outflows[len(outflows)-1].TxnDate
		nextExpected := s.predictNextOccurrence(lastDate, frequency)

		// Create pattern
		pattern := &models.CashFlowPattern{
			TenantID:        tenantID,
			PatternType:     models.PatternTypeRecurringVendor,
			VendorID:        &vendorID,
			Frequency:       frequency,
			AvgAmount:       avgAmount,
			AmountVariance:  &variance,
			Confidence:      confidence,
			OccurrenceCount: len(outflows),
			LastDetected:    time.Now(),
			NextExpected:    &nextExpected,
			Metadata: map[string]interface{}{
				"intervals_days": intervals,
				"last_amounts":   amounts[max(0, len(amounts)-5):],
			},
		}

		if err := s.patternRepo.UpsertPattern(ctx, pattern); err != nil {
			log.Error().Err(err).Str("vendor_id", vendorID.String()).Msg("failed to save recurring vendor pattern")
		}
	}

	return nil
}

// DetectPayrollCycles identifies payroll patterns
func (s *CashFlowDNAService) DetectPayrollCycles(ctx context.Context, tenantID uuid.UUID, transactions []models.BankTransaction) error {
	// Filter for potential payroll transactions
	payrollTxns := []models.BankTransaction{}
	for _, txn := range transactions {
		if txn.Amount >= 0 {
			continue // Only outflows
		}
		
		desc := strings.ToLower(txn.Description)
		if strings.Contains(desc, "payroll") || strings.Contains(desc, "salary") || 
		   strings.Contains(desc, "wages") || strings.Contains(desc, "salaries") {
			payrollTxns = append(payrollTxns, txn)
		}
	}

	if len(payrollTxns) < 3 {
		return nil
	}

	// Sort by date
	sort.Slice(payrollTxns, func(i, j int) bool {
		return payrollTxns[i].TxnDate.Before(payrollTxns[j].TxnDate)
	})

	// Analyze frequency
	frequency, intervals := s.analyzeFrequency(payrollTxns)
	if frequency == "" || (frequency != models.FrequencyBiweekly && frequency != models.FrequencyMonthly) {
		return nil
	}

	// Calculate statistics
	amounts := extractAmounts(payrollTxns)
	avgAmount := average(amounts)
	variance := standardDeviation(amounts) / math.Abs(avgAmount) * 100

	// Calculate confidence (payroll should be very regular)
	confidence := s.calculateConfidence(intervals, amounts, len(payrollTxns))

	if confidence < 60 {
		return nil
	}

	// Predict next payroll
	lastDate := payrollTxns[len(payrollTxns)-1].TxnDate
	nextExpected := s.predictNextOccurrence(lastDate, frequency)

	pattern := &models.CashFlowPattern{
		TenantID:        tenantID,
		PatternType:     models.PatternTypePayroll,
		VendorID:        nil,
		Frequency:       frequency,
		AvgAmount:       avgAmount,
		AmountVariance:  &variance,
		Confidence:      confidence,
		OccurrenceCount: len(payrollTxns),
		LastDetected:    time.Now(),
		NextExpected:    &nextExpected,
		Metadata: map[string]interface{}{
			"description_keywords": []string{"payroll", "salary", "wages"},
			"intervals_days":       intervals,
		},
	}

	return s.patternRepo.UpsertPattern(ctx, pattern)
}

// DetectSubscriptions finds subscription-like patterns
func (s *CashFlowDNAService) DetectSubscriptions(ctx context.Context, tenantID uuid.UUID, transactions []models.BankTransaction) error {
	// Group by vendor
	vendorGroups := s.groupTransactionsByVendor(transactions)

	for vendorID, txns := range vendorGroups {
		if vendorID == uuid.Nil || len(txns) < 2 {
			continue
		}

		// Only outflows
		outflows := filterOutflows(txns)
		if len(outflows) < 2 {
			continue
		}

		// Check for consistent amounts (subscription characteristic)
		amounts := extractAmounts(outflows)
		avgAmount := average(amounts)
		variance := standardDeviation(amounts) / math.Abs(avgAmount) * 100

		// Subscriptions have very consistent amounts
		if variance > 5 {
			continue
		}

		// Analyze frequency (subscriptions are typically monthly)
		frequency, intervals := s.analyzeFrequency(outflows)
		if frequency != models.FrequencyMonthly {
			continue
		}

		// Calculate confidence
		confidence := s.calculateConfidence(intervals, amounts, len(outflows))

		if confidence < 70 {
			continue
		}

		// Predict next charge
		lastDate := outflows[len(outflows)-1].TxnDate
		nextExpected := s.predictNextOccurrence(lastDate, frequency)

		pattern := &models.CashFlowPattern{
			TenantID:        tenantID,
			PatternType:     models.PatternTypeSubscription,
			VendorID:        &vendorID,
			Frequency:       frequency,
			AvgAmount:       avgAmount,
			AmountVariance:  &variance,
			Confidence:      confidence,
			OccurrenceCount: len(outflows),
			LastDetected:    time.Now(),
			NextExpected:    &nextExpected,
			Metadata: map[string]interface{}{
				"amount_consistency": 100 - variance,
			},
		}

		if err := s.patternRepo.UpsertPattern(ctx, pattern); err != nil {
			log.Error().Err(err).Str("vendor_id", vendorID.String()).Msg("failed to save subscription pattern")
		}
	}

	return nil
}

// CalculateBurnRate calculates monthly burn rate from detected patterns
func (s *CashFlowDNAService) CalculateBurnRate(ctx context.Context, tenantID uuid.UUID) error {
	// Get all high-confidence recurring patterns
	patterns, err := s.patternRepo.GetPatternsByTenant(ctx, tenantID, 60)
	if err != nil {
		return fmt.Errorf("fetching patterns: %w", err)
	}

	if len(patterns) == 0 {
		return nil
	}

	// Calculate monthly burn from recurring outflows
	var monthlyPayroll, monthlySubscriptions, monthlyVendors float64
	var totalOutflows float64
	patternCount := 0

	for _, p := range patterns {
		if p.AvgAmount >= 0 {
			continue // Skip inflows
		}

		// Convert to monthly equivalent
		monthlyAmount := s.convertToMonthly(p.AvgAmount, p.Frequency)

		switch p.PatternType {
		case models.PatternTypePayroll:
			monthlyPayroll += monthlyAmount
		case models.PatternTypeSubscription:
			monthlySubscriptions += monthlyAmount
		case models.PatternTypeRecurringVendor:
			monthlyVendors += monthlyAmount
		}

		totalOutflows += monthlyAmount
		patternCount++
	}

	if patternCount == 0 {
		return nil
	}

	// Calculate confidence based on pattern coverage
	confidence := math.Min(float64(patternCount)*10, 100)

	pattern := &models.CashFlowPattern{
		TenantID:        tenantID,
		PatternType:     models.PatternTypeBurnRate,
		VendorID:        nil,
		Frequency:       models.FrequencyMonthly,
		AvgAmount:       totalOutflows,
		Confidence:      confidence,
		OccurrenceCount: patternCount,
		LastDetected:    time.Now(),
		Metadata: map[string]interface{}{
			"components": map[string]float64{
				"payroll":       monthlyPayroll,
				"subscriptions": monthlySubscriptions,
				"vendors":       monthlyVendors,
			},
			"monthly_burn": totalOutflows,
		},
	}

	return s.patternRepo.UpsertPattern(ctx, pattern)
}

// Helper methods

func (s *CashFlowDNAService) groupTransactionsByVendor(transactions []models.BankTransaction) map[uuid.UUID][]models.BankTransaction {
	groups := make(map[uuid.UUID][]models.BankTransaction)
	
	for _, txn := range transactions {
		vendorID := uuid.Nil
		if txn.VendorID != nil {
			vendorID = *txn.VendorID
		}
		groups[vendorID] = append(groups[vendorID], txn)
	}
	
	return groups
}

func (s *CashFlowDNAService) analyzeFrequency(transactions []models.BankTransaction) (string, []int) {
	if len(transactions) < 2 {
		return "", nil
	}

	// Sort by date
	sorted := make([]models.BankTransaction, len(transactions))
	copy(sorted, transactions)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].TxnDate.Before(sorted[j].TxnDate)
	})

	// Calculate intervals
	intervals := []int{}
	for i := 1; i < len(sorted); i++ {
		days := int(sorted[i].TxnDate.Sub(sorted[i-1].TxnDate).Hours() / 24)
		intervals = append(intervals, days)
	}

	if len(intervals) == 0 {
		return "", nil
	}

	// Find average interval
	avgInterval := average(toFloat64(intervals))

	// Determine frequency
	var frequency string
	switch {
	case avgInterval >= 0 && avgInterval <= 2:
		frequency = models.FrequencyDaily
	case avgInterval >= 6 && avgInterval <= 8:
		frequency = models.FrequencyWeekly
	case avgInterval >= 13 && avgInterval <= 15:
		frequency = models.FrequencyBiweekly
	case avgInterval >= 28 && avgInterval <= 32:
		frequency = models.FrequencyMonthly
	case avgInterval >= 88 && avgInterval <= 92:
		frequency = models.FrequencyQuarterly
	default:
		return "", intervals
	}

	return frequency, intervals
}

func (s *CashFlowDNAService) calculateConfidence(intervals []int, amounts []float64, occurrenceCount int) float64 {
	// Multi-factor confidence: regularity (40%) + amount consistency (30%) + occurrence bonus (30%)
	
	// Regularity score
	regularityScore := 100.0
	if len(intervals) > 0 {
		avgInterval := average(toFloat64(intervals))
		intervalVariance := standardDeviation(toFloat64(intervals))
		if avgInterval > 0 {
			regularityScore = math.Max(0, 100-(intervalVariance/avgInterval*100))
		}
	}

	// Amount consistency score
	amountScore := 100.0
	if len(amounts) > 0 {
		avgAmount := average(amounts)
		if avgAmount != 0 {
			amountVariance := standardDeviation(amounts) / math.Abs(avgAmount) * 100
			amountScore = math.Max(0, 100-amountVariance)
		}
	}

	// Occurrence bonus
	occurrenceBonus := math.Min(float64(occurrenceCount)*10, 100)

	// Weighted average
	confidence := (regularityScore * 0.4) + (amountScore * 0.3) + (occurrenceBonus * 0.3)

	return math.Round(confidence*100) / 100
}

func (s *CashFlowDNAService) predictNextOccurrence(lastDate time.Time, frequency string) time.Time {
	switch frequency {
	case models.FrequencyDaily:
		return lastDate.AddDate(0, 0, 1)
	case models.FrequencyWeekly:
		return lastDate.AddDate(0, 0, 7)
	case models.FrequencyBiweekly:
		return lastDate.AddDate(0, 0, 14)
	case models.FrequencyMonthly:
		return lastDate.AddDate(0, 1, 0)
	case models.FrequencyQuarterly:
		return lastDate.AddDate(0, 3, 0)
	default:
		return lastDate.AddDate(0, 1, 0)
	}
}

func (s *CashFlowDNAService) convertToMonthly(amount float64, frequency string) float64 {
	switch frequency {
	case models.FrequencyDaily:
		return amount * 30
	case models.FrequencyWeekly:
		return amount * 4.33
	case models.FrequencyBiweekly:
		return amount * 2.17
	case models.FrequencyMonthly:
		return amount
	case models.FrequencyQuarterly:
		return amount / 3
	default:
		return amount
	}
}

// Utility functions

func filterOutflows(transactions []models.BankTransaction) []models.BankTransaction {
	outflows := []models.BankTransaction{}
	for _, txn := range transactions {
		if txn.Amount < 0 {
			outflows = append(outflows, txn)
		}
	}
	return outflows
}

func extractAmounts(transactions []models.BankTransaction) []float64 {
	amounts := make([]float64, len(transactions))
	for i, txn := range transactions {
		amounts[i] = txn.Amount
	}
	return amounts
}

func average(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sum := 0.0
	for _, v := range values {
		sum += v
	}
	return sum / float64(len(values))
}

func standardDeviation(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	avg := average(values)
	sumSquares := 0.0
	for _, v := range values {
		diff := v - avg
		sumSquares += diff * diff
	}
	return math.Sqrt(sumSquares / float64(len(values)))
}

func toFloat64(ints []int) []float64 {
	floats := make([]float64, len(ints))
	for i, v := range ints {
		floats[i] = float64(v)
	}
	return floats
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
