package http

import (
"fmt"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	ragDomain "github.com/finch-co/cashflow/internal/ai/rag/domain"
	ragUsecase "github.com/finch-co/cashflow/internal/ai/rag/usecase"
	"github.com/finch-co/cashflow/internal/ai/router"
	"github.com/finch-co/cashflow/internal/api/handlers"
	models "github.com/finch-co/cashflow/internal/models"
)

// RagHandler handles HTTP requests for RAG queries
type RagHandler struct {
	queryRepo    ragDomain.QueryRepository
	ragUseCase   *ragUsecase.RagQueryUseCase
	hybridRouter *router.HybridRouter
}

// NewRagHandler creates a new RAG handler
func NewRagHandler(
	queryRepo ragDomain.QueryRepository,
	ragUseCase *ragUsecase.RagQueryUseCase,
	hybridRouter *router.HybridRouter,
) *RagHandler {
	return &RagHandler{
		queryRepo:    queryRepo,
		ragUseCase:   ragUseCase,
		hybridRouter: hybridRouter,
	}
}

// RegisterRoutes registers RAG query routes
func (h *RagHandler) RegisterRoutes(r chi.Router) {
	r.Post("/query", h.Query)
	r.Get("/queries", h.ListQueries)
	r.Get("/queries/{queryID}", h.GetQuery)
}

// Query handles RAG query requests
func (h *RagHandler) Query(w http.ResponseWriter, r *http.Request) {
	// Get tenant ID from context
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		handlers.WriteErrorResponse(w, fmt.Errorf("tenant_id required"))
		return
	}

	// Parse request body
	var req struct {
		Question string `json:"question"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		handlers.WriteErrorResponse(w, fmt.Errorf("invalid request body"))
		return
	}

	if req.Question == "" {
		handlers.WriteErrorResponse(w, fmt.Errorf("question is required"))
		return
	}

	// Route through hybrid router if available
	if h.hybridRouter != nil {
		result, err := h.hybridRouter.Route(r.Context(), router.RouterInput{
			TenantID: tenantID,
			Question: req.Question,
		})
		if err != nil {
			log.Error().Err(err).Msg("Hybrid router failed")
			handlers.WriteErrorResponse(w, fmt.Errorf("failed to process query"))
			return
		}

		// Convert to RAG response format (exclude metadata from public API)
		response := &ragUsecase.RagQueryOutput{
			Answer:    result.Answer,
			Citations: result.Citations,
		}
		handlers.WriteJSON(w, http.StatusOK, response)
		return
	}

	// Fallback to existing RAG use case
	result, err := h.ragUseCase.Execute(r.Context(), ragUsecase.RagQueryInput{
		TenantID: tenantID,
		Question: req.Question,
	})
	if err != nil {
		log.Error().Err(err).Msg("RAG query failed")
		handlers.WriteErrorResponse(w, fmt.Errorf("failed to process query"))
		return
	}

	// Return response
	handlers.WriteJSON(w, http.StatusOK, result)
}

// ListQueries handles listing query history
func (h *RagHandler) ListQueries(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		handlers.WriteErrorResponse(w, fmt.Errorf("tenant_id required"))
		return
	}

	limit := 20
	offset := 0

	queries, total, err := h.queryRepo.ListByTenant(r.Context(), tenantID, limit, offset)
	if err != nil {
		handlers.WriteErrorResponse(w, fmt.Errorf("failed to list queries"))
		return
	}

	response := map[string]interface{}{
		"queries": queries,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	}
	handlers.WriteJSON(w, http.StatusOK, response)
}

// GetQuery handles getting a single query
func (h *RagHandler) GetQuery(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		handlers.WriteErrorResponse(w, fmt.Errorf("tenant_id required"))
		return
	}

	queryID, err := uuid.Parse(chi.URLParam(r, "queryID"))
	if err != nil {
		handlers.WriteErrorResponse(w, fmt.Errorf("invalid query ID"))
		return
	}

	query, err := h.queryRepo.GetByID(r.Context(), tenantID, queryID)
	if err != nil {
		handlers.WriteErrorResponse(w, fmt.Errorf("query not found"))
		return
	}

	handlers.WriteJSON(w, http.StatusOK, query)
}
