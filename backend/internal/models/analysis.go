package models

import (
	"time"

	"github.com/google/uuid"
)

type RiskLevel string

const (
	RiskLevelCritical RiskLevel = "critical" // < 15 days
	RiskLevelWarning  RiskLevel = "warning"  // < 30 days
	RiskLevelHealthy  RiskLevel = "healthy"  // >= 30 days
)

type LiquidityAnalysis struct {
	CurrentBalance    float64
	DailyBurnRate     float64
	RunwayDays        int
	RiskLevel         RiskLevel
	ProjectedZeroDate time.Time
}

type ExpenseBreakdown struct {
	Category   string
	Amount     float64
	Percentage float64
	Count      int
	IsDominant bool // true if > 50% of total outflow
}

type RecurringPayment struct {
	Description  string
	Counterparty string
	Amount       float64
	Frequency    string // "monthly", "weekly"
	Count        int
	TotalPerYear float64
	NextExpected time.Time
}

type CollectionHealth struct {
	TotalInflow     float64
	InflowCount     int
	AvgDaysBetween  float64
	LargestGapDays  int
	CollectionScore int  // 0-100
	IsIrregular     bool // true if LargestGapDays > 30
}

type Recommendation struct {
	Priority    int    // 1 = highest
	Title       string // Arabic
	Description string // Arabic
	Action      string // Arabic
	Impact      string // "high", "medium", "low"
}

type CashAnalysis struct {
	ID                uuid.UUID
	TenantID          uuid.UUID
	AnalyzedAt        time.Time
	HealthScore       int // 0-100
	RiskLevel         RiskLevel
	RunwayDays        int
	Liquidity         LiquidityAnalysis
	ExpenseBreakdown  []ExpenseBreakdown
	RecurringPayments []RecurringPayment
	CollectionHealth  CollectionHealth
	Recommendations   []Recommendation
	TransactionCount  int
	SourceReference   string // Reference to source data or trigger
	AnalysisVersion   string // Analysis algorithm version
	CreatedAt         time.Time
}
