package models

// TreasuryAction represents a recommended financial action for the tenant
type TreasuryAction struct {
	Type        string  `json:"type"`        // action identifier (e.g., "delay_vendor_payments")
	Category    string  `json:"category"`    // liquidity, revenue, cost_reduction
	Title       string  `json:"title"`       // display title
	Description string  `json:"description"` // user-facing explanation
	Impact      float64 `json:"impact"`      // estimated SAR impact (positive number)
	Confidence  float64 `json:"confidence"`  // 0.0-1.0 confidence score
	Currency    string  `json:"currency"`    // "SAR"
}

// Action type constants
const (
	ActionDelayVendorPayments   = "delay_vendor_payments"
	ActionAccelerateReceivables = "accelerate_receivables"
	ActionMoveLiquidity         = "move_liquidity"
	ActionReduceMarketingSpend  = "reduce_marketing_spend"
	ActionDelayHiring           = "delay_hiring"
	ActionCutDiscretionarySpend = "cut_discretionary_spend"
)

// Category constants
const (
	CategoryLiquidity     = "liquidity"
	CategoryRevenue       = "revenue"
	CategoryCostReduction = "cost_reduction"
)
