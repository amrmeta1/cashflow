package insights

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	domain "tadfuq/rag-service/internal/domain/insights"
)

// Handler exposes the deterministic Insights Engine over HTTP.
// It contains zero business logic — all rules live in the domain layer.
type Handler struct {
	svc domain.InsightsService
}

// NewHandler constructs the insights HTTP handler.
func NewHandler(svc domain.InsightsService) *Handler {
	return &Handler{svc: svc}
}

// GetInsights handles GET /api/v1/tenants/:tenantId/insights
//
// Returns:
//
//	{
//	  "tenant_id": "...",
//	  "generated_at": "...",
//	  "data_range":  { "from": "...", "to": "..." },
//	  "risks":           [...],
//	  "opportunities":   [...],
//	  "recommendations": [...]
//	}
func (h *Handler) GetInsights(c *gin.Context) {
	tenantID, err := uuid.Parse(c.Param("tenantId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_TENANT_ID",
			"message": "tenantId must be a valid UUID v4",
		})
		return
	}

	result, err := h.svc.Run(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "INSIGHTS_ERROR",
			"message": "failed to compute insights: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, toResponse(result))
}

// ─── Mapping: domain → DTO ────────────────────────────────────────────────────

func toResponse(r *domain.InsightResult) InsightsResponse {
	risks := make([]RiskDTO, len(r.Risks))
	for i, risk := range r.Risks {
		risks[i] = RiskDTO{
			ID:       string(risk.ID),
			Severity: string(risk.Severity),
			Title:    risk.Title,
			Message:  risk.Message,
			Data:     risk.Data,
		}
	}

	opps := make([]OpportunityDTO, len(r.Opportunities))
	for i, o := range r.Opportunities {
		opps[i] = OpportunityDTO{
			ID:             string(o.ID),
			Title:          o.Title,
			Message:        o.Message,
			PotentialValue: o.PotentialValue,
			Data:           o.Data,
		}
	}

	recs := make([]RecommendationDTO, len(r.Recommendations))
	for i, rec := range r.Recommendations {
		recs[i] = RecommendationDTO{
			Priority:   rec.Priority,
			Action:     rec.Action,
			Rationale:  rec.Rationale,
			LinkedRisk: string(rec.LinkedRisk),
			Data:       rec.Data,
		}
	}

	return InsightsResponse{
		TenantID:    r.TenantID,
		GeneratedAt: r.GeneratedAt,
		DataRange: DataRangeDTO{
			From: r.DataRange.From,
			To:   r.DataRange.To,
		},
		Risks:           risks,
		Opportunities:   opps,
		Recommendations: recs,
	}
}
