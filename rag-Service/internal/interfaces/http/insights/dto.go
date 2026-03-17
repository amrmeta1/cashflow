package insights

import (
	"time"

	"github.com/google/uuid"
)

// RiskDTO is the HTTP representation of a detected risk.
type RiskDTO struct {
	ID       string         `json:"id"`
	Severity string         `json:"severity"`
	Title    string         `json:"title"`
	Message  string         `json:"message"`
	Data     map[string]any `json:"data"`
}

// OpportunityDTO is the HTTP representation of an improvement opportunity.
type OpportunityDTO struct {
	ID             string         `json:"id"`
	Title          string         `json:"title"`
	Message        string         `json:"message"`
	PotentialValue float64        `json:"potential_value"`
	Data           map[string]any `json:"data"`
}

// RecommendationDTO is a prioritised, actionable recommendation.
type RecommendationDTO struct {
	Priority   int            `json:"priority"`
	Action     string         `json:"action"`
	Rationale  string         `json:"rationale"`
	LinkedRisk string         `json:"linked_risk,omitempty"`
	Data       map[string]any `json:"data"`
}

// DataRangeDTO represents the span of data used in the analysis.
type DataRangeDTO struct {
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}

// InsightsResponse is the full response for GET .../insights.
// Structure is exactly the required output:
//
//	{ risks: [], opportunities: [], recommendations: [] }
type InsightsResponse struct {
	TenantID        uuid.UUID           `json:"tenant_id"`
	GeneratedAt     time.Time           `json:"generated_at"`
	DataRange       DataRangeDTO        `json:"data_range"`
	Risks           []RiskDTO           `json:"risks"`
	Opportunities   []OpportunityDTO    `json:"opportunities"`
	Recommendations []RecommendationDTO `json:"recommendations"`
}
