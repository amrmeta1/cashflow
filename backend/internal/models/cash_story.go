package models

import "time"

// CashStoryResult represents the result of a cash story analysis
type CashStoryResult struct {
	Summary     string       `json:"summary"`
	Drivers     []CashDriver `json:"drivers"`
	RiskLevel   string       `json:"risk_level"`
	Confidence  float64      `json:"confidence"`
	GeneratedAt time.Time    `json:"generated_at"`
}

// CashDriver represents a key driver of cash movement
type CashDriver struct {
	Name   string  `json:"name"`
	Impact float64 `json:"impact"`
	Type   string  `json:"type"` // "inflow" or "outflow"
}
