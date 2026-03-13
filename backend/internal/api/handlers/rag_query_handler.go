package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/ai/rag/usecase"
	"github.com/finch-co/cashflow/internal/models"
)

// HybridRouter interface to avoid import cycle
type HybridRouter interface {
	Route(ctx interface{}, input RouterInput) (*RouterOutput, error)
}

// RouterInput for hybrid router
type RouterInput struct {
	TenantID uuid.UUID
	Question string
}

// RouterOutput from hybrid router
type RouterOutput struct {
	Answer    string
	Citations []interface{}
}

// RagQueryHandler wraps RAG query functionality for the AI Advisor
type RagQueryHandler struct {
	ragUseCase   *usecase.RagQueryUseCase
	hybridRouter HybridRouter
}

// NewRagQueryHandler creates a new RAG query handler
func NewRagQueryHandler(
	ragUseCase *usecase.RagQueryUseCase,
	hybridRouter HybridRouter,
) *RagQueryHandler {
	return &RagQueryHandler{
		ragUseCase:   ragUseCase,
		hybridRouter: hybridRouter,
	}
}

// Query handles POST /tenants/{tenantID}/rag/query
func (h *RagQueryHandler) Query(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		WriteErrorResponse(w, models.ErrTenantRequired)
		return
	}

	var req struct {
		Question string `json:"question"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	if req.Question == "" {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	// Try hybrid router first if available
	if h.hybridRouter != nil {
		result, err := h.hybridRouter.Route(r.Context(), RouterInput{
			TenantID: tenantID,
			Question: req.Question,
		})
		if err != nil {
			log.Error().Err(err).Msg("Hybrid router failed")
			// Fallback to error message
			WriteJSON(w, http.StatusOK, map[string]interface{}{
				"answer":    "AI assistant temporarily unavailable.",
				"citations": []interface{}{},
			})
			return
		}

		WriteJSON(w, http.StatusOK, map[string]interface{}{
			"answer":    result.Answer,
			"citations": result.Citations,
		})
		return
	}

	// Fallback to RAG use case if hybrid router not available
	if h.ragUseCase != nil {
		result, err := h.ragUseCase.Execute(r.Context(), usecase.RagQueryInput{
			TenantID: tenantID,
			Question: req.Question,
		})
		if err != nil {
			log.Error().Err(err).Msg("RAG query failed")
			// Fallback to error message
			WriteJSON(w, http.StatusOK, map[string]interface{}{
				"answer":    "AI assistant temporarily unavailable.",
				"citations": []interface{}{},
			})
			return
		}

		WriteJSON(w, http.StatusOK, map[string]interface{}{
			"answer":    result.Answer,
			"citations": result.Citations,
		})
		return
	}

	// No RAG service available
	WriteJSON(w, http.StatusOK, map[string]interface{}{
		"answer":    "AI assistant temporarily unavailable.",
		"citations": []interface{}{},
	})
}
