package liquidity

import (
"github.com/finch-co/cashflow/internal/models"
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"

	llm "github.com/finch-co/cashflow/internal/ai/claude"
)

const cashStoryPrompt = `You are a treasury analyst for a GCC-based company.

Analyze the following financial data and write a concise cash movement summary (2-3 sentences):

Cash Delta: %s
Period: Last 7 days

Top Inflows:
%s

Top Outflows:
%s

Forecast Risk: %s

Write a professional summary explaining:
1. The cash change and its significance
2. Main drivers (inflows/outflows)
3. Any notable risks or opportunities

Keep it concise and actionable. Use SAR currency.`

// CashStoryUseCase handles cash story generation logic
type CashStoryUseCase struct {
	txnRepo    models.BankTransactionRepository
	forecastUC *ForecastUseCase
	llmClient  llm.LLMClient
}

// NewCashStoryUseCase creates a new cash story use case
func NewCashStoryUseCase(
	txnRepo models.BankTransactionRepository,
	forecastUC *ForecastUseCase,
	llmClient llm.LLMClient,
) *CashStoryUseCase {
	return &CashStoryUseCase{
		txnRepo:    txnRepo,
		forecastUC: forecastUC,
		llmClient:  llmClient,
	}
}

// GenerateCashStory generates an AI-powered cash story for the given tenant
func (uc *CashStoryUseCase) GenerateCashStory(ctx context.Context, tenantID uuid.UUID) (*models.CashStoryResult, error) {
	now := time.Now().UTC()
	from := now.AddDate(0, 0, -7) // Last 7 days

	// Fetch transactions for the last 7 days
	filter := models.TransactionFilter{
		TenantID: tenantID,
		From:     &from,
		To:       &now,
		Limit:    10000,
		Offset:   0,
	}

	txns, _, err := uc.txnRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("fetching transactions: %w", err)
	}

	// Calculate cash delta
	cashDelta := uc.calculateCashDelta(txns)

	// Identify top drivers
	drivers := uc.identifyTopDrivers(txns)

	// Fetch forecast for risk assessment
	var riskLevel string
	var forecastConfidence float64
	if uc.forecastUC != nil {
		forecast, err := uc.forecastUC.GenerateForecast(ctx, tenantID)
		if err == nil && forecast != nil {
			riskLevel = uc.determineRiskLevel(cashDelta, forecast)
			forecastConfidence = forecast.Confidence
		}
	}

	// Default risk level if forecast unavailable
	if riskLevel == "" {
		riskLevel = uc.determineRiskLevelFromDelta(cashDelta)
	}

	// Generate narrative using Claude
	summary, confidence := uc.generateNarrative(ctx, cashDelta, drivers, riskLevel, forecastConfidence)

	return &models.CashStoryResult{
		Summary:     summary,
		Drivers:     drivers,
		RiskLevel:   riskLevel,
		Confidence:  confidence,
		GeneratedAt: now,
	}, nil
}

// calculateCashDelta calculates the net cash change from transactions
func (uc *CashStoryUseCase) calculateCashDelta(txns []models.BankTransaction) float64 {
	var delta float64
	for _, txn := range txns {
		delta += txn.Amount
	}
	return delta
}

// identifyTopDrivers identifies the top cash drivers (inflows and outflows)
func (uc *CashStoryUseCase) identifyTopDrivers(txns []models.BankTransaction) []models.CashDriver {
	// Group transactions by description/category
	driverMap := make(map[string]float64)
	for _, txn := range txns {
		key := uc.normalizeDescription(txn.Description)
		driverMap[key] += txn.Amount
	}

	// Convert to slice
	type driverEntry struct {
		name   string
		impact float64
	}
	var entries []driverEntry
	for name, impact := range driverMap {
		entries = append(entries, driverEntry{name: name, impact: impact})
	}

	// Sort by absolute impact
	sort.Slice(entries, func(i, j int) bool {
		return math.Abs(entries[i].impact) > math.Abs(entries[j].impact)
	})

	// Take top 3 inflows and top 3 outflows
	var drivers []models.CashDriver
	inflowCount := 0
	outflowCount := 0

	for _, entry := range entries {
		if entry.impact > 0 && inflowCount < 3 {
			drivers = append(drivers, models.CashDriver{
				Name:   entry.name,
				Impact: entry.impact,
				Type:   "inflow",
			})
			inflowCount++
		} else if entry.impact < 0 && outflowCount < 3 {
			drivers = append(drivers, models.CashDriver{
				Name:   entry.name,
				Impact: math.Abs(entry.impact),
				Type:   "outflow",
			})
			outflowCount++
		}

		if inflowCount >= 3 && outflowCount >= 3 {
			break
		}
	}

	return drivers
}

// normalizeDescription normalizes transaction descriptions for grouping
func (uc *CashStoryUseCase) normalizeDescription(desc string) string {
	desc = strings.ToLower(desc)

	// Common patterns
	if strings.Contains(desc, "payroll") || strings.Contains(desc, "salary") {
		return "Payroll"
	}
	if strings.Contains(desc, "vendor") || strings.Contains(desc, "supplier") {
		return "Vendor payments"
	}
	if strings.Contains(desc, "customer") || strings.Contains(desc, "receipt") {
		return "Customer receipts"
	}
	if strings.Contains(desc, "utility") || strings.Contains(desc, "utilities") {
		return "Utilities"
	}
	if strings.Contains(desc, "rent") {
		return "Rent"
	}
	if strings.Contains(desc, "tax") || strings.Contains(desc, "vat") {
		return "Tax payments"
	}

	// Truncate long descriptions
	if len(desc) > 30 {
		desc = desc[:30]
	}

	// Capitalize first letter
	if len(desc) > 0 {
		desc = strings.ToUpper(desc[:1]) + desc[1:]
	}

	return desc
}

// determineRiskLevel determines risk level based on cash delta and forecast
func (uc *CashStoryUseCase) determineRiskLevel(cashDelta float64, forecast *models.ForecastResult) string {
	// Check forecast confidence
	if forecast.Confidence < 0.5 {
		return "high"
	}

	// Check cash delta magnitude relative to current cash
	if forecast.Metrics.CurrentCash > 0 {
		deltaPercent := math.Abs(cashDelta) / forecast.Metrics.CurrentCash
		if deltaPercent > 0.3 {
			return "high"
		}
		if deltaPercent > 0.15 {
			return "medium"
		}
	}

	return "low"
}

// determineRiskLevelFromDelta determines risk level based only on cash delta
func (uc *CashStoryUseCase) determineRiskLevelFromDelta(cashDelta float64) string {
	absDelta := math.Abs(cashDelta)
	if absDelta > 1_000_000 {
		return "high"
	}
	if absDelta > 500_000 {
		return "medium"
	}
	return "low"
}

// generateNarrative generates the AI narrative using Claude
func (uc *CashStoryUseCase) generateNarrative(
	ctx context.Context,
	cashDelta float64,
	drivers []models.CashDriver,
	riskLevel string,
	forecastConfidence float64,
) (string, float64) {
	// If no LLM client, return fallback
	if uc.llmClient == nil {
		return "Cash movement detected. AI narrative temporarily unavailable.", 0.0
	}

	// Build prompt
	prompt := uc.buildPrompt(cashDelta, drivers, riskLevel)

	// Call Claude
	resp, err := uc.llmClient.Complete(ctx, llm.CompletionRequest{
		Messages: []llm.Message{
			{Role: "user", Content: prompt},
		},
		MaxTokens: 512,
	})

	if err != nil {
		// Fallback on error
		return "Cash movement detected. AI narrative temporarily unavailable.", 0.0
	}

	// Calculate confidence (combine forecast confidence with presence of data)
	confidence := 0.8 // Base confidence for having data
	if forecastConfidence > 0 {
		confidence = (confidence + forecastConfidence) / 2
	}

	return resp.Content, confidence
}

// buildPrompt builds the Claude prompt
func (uc *CashStoryUseCase) buildPrompt(cashDelta float64, drivers []models.CashDriver, riskLevel string) string {
	// Format cash delta
	deltaStr := fmt.Sprintf("SAR %.2f", cashDelta)
	if cashDelta >= 0 {
		deltaStr = "+" + deltaStr
	}

	// Format inflows
	var inflowsStr strings.Builder
	for _, d := range drivers {
		if d.Type == "inflow" {
			inflowsStr.WriteString(fmt.Sprintf("- %s: SAR %.2f\n", d.Name, d.Impact))
		}
	}
	if inflowsStr.Len() == 0 {
		inflowsStr.WriteString("- None significant\n")
	}

	// Format outflows
	var outflowsStr strings.Builder
	for _, d := range drivers {
		if d.Type == "outflow" {
			outflowsStr.WriteString(fmt.Sprintf("- %s: SAR %.2f\n", d.Name, d.Impact))
		}
	}
	if outflowsStr.Len() == 0 {
		outflowsStr.WriteString("- None significant\n")
	}

	return fmt.Sprintf(cashStoryPrompt,
		deltaStr,
		inflowsStr.String(),
		outflowsStr.String(),
		riskLevel,
	)
}
