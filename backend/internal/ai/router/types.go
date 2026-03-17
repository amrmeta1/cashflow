package router

import (
	"github.com/finch-co/cashflow/internal/ai/rag/domain"
	"github.com/google/uuid"
)

// RouteType represents the type of routing decision
type RouteType string

const (
	RouteTypeForecast RouteType = "forecast"
	RouteTypeRAG      RouteType = "rag"
	RouteTypeHybrid   RouteType = "hybrid"
	RouteTypeAdvice   RouteType = "advice"
)

// RouterInput represents input for the hybrid router
type RouterInput struct {
	TenantID uuid.UUID
	UserID   uuid.UUID
	Question string
}

// RouterOutput represents output from the hybrid router
type RouterOutput struct {
	Answer    string            `json:"answer"`
	Citations []domain.Citation `json:"citations"`
	Metadata  RouteMetadata     `json:"metadata,omitempty"`
}

// RouteMetadata contains internal routing decision information
type RouteMetadata struct {
	Route      RouteType `json:"route"`
	Confidence float64   `json:"confidence"`
	Reason     string    `json:"reason"`
}
