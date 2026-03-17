package signals

import (
	"context"
	"fmt"
	"time"

	"github.com/finch-co/cashflow/internal/agent/models"
)

// VendorConcentrationDetector detects when spending is too concentrated with one vendor
type VendorConcentrationDetector struct{}

func NewVendorConcentrationDetector() *VendorConcentrationDetector {
	return &VendorConcentrationDetector{}
}

func (d *VendorConcentrationDetector) Detect(ctx context.Context, input DetectionInput) ([]models.CreateSignalInput, error) {
	signals := []models.CreateSignalInput{}

	if len(input.Transactions) == 0 {
		return signals, nil
	}

	// Analyze last 90 days
	cutoff := time.Now().AddDate(0, 0, -90)
	vendorSpend := make(map[string]float64)
	var totalSpend float64

	for _, txn := range input.Transactions {
		if txn.Amount < 0 && txn.TxnDate.After(cutoff) { // Outflows only
			vendor := txn.Counterparty
			if vendor == "" {
				vendor = "Unknown"
			}
			amount := -txn.Amount
			vendorSpend[vendor] += amount
			totalSpend += amount
		}
	}

	if totalSpend == 0 {
		return signals, nil
	}

	// Find top vendor
	var topVendor string
	var topSpend float64
	for vendor, spend := range vendorSpend {
		if spend > topSpend {
			topVendor = vendor
			topSpend = spend
		}
	}

	concentrationPct := (topSpend / totalSpend) * 100

	if concentrationPct <= 35 {
		return signals, nil
	}

	var severity string
	if concentrationPct > 50 {
		severity = models.SeverityHigh
	} else {
		severity = models.SeverityMedium
	}

	title := fmt.Sprintf("High vendor concentration: %.1f%% with %s", concentrationPct, topVendor)
	description := fmt.Sprintf("Top vendor accounts for %.1f%% of total spend (%.2f of %.2f)",
		concentrationPct, topSpend, totalSpend)

	signal := models.CreateSignalInput{
		TenantID:    input.TenantID,
		SignalType:  models.SignalTypeVendorConcentration,
		Severity:    severity,
		Title:       title,
		Description: description,
		Data: map[string]interface{}{
			"top_vendor":         topVendor,
			"vendor_spend":       topSpend,
			"total_spend":        totalSpend,
			"concentration_pct":  concentrationPct,
			"period_days":        90,
		},
	}

	signals = append(signals, signal)
	return signals, nil
}
