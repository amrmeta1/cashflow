package handlers

import (
	"net/http"
	"strconv"

	"github.com/finch-co/cashflow/internal/models"
)

type AuditHandler struct {
	repo models.AuditLogRepository
}

func NewAuditHandler(repo models.AuditLogRepository) *AuditHandler {
	return &AuditHandler{repo: repo}
}

func (h *AuditHandler) ListByTenant(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := models.TenantIDFromContext(r.Context())
	if !ok {
		WriteErrorResponse(w, models.ErrTenantRequired)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}

	logs, total, err := h.repo.ListByTenant(r.Context(), tenantID, limit, offset)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}

	WriteJSONList(w, http.StatusOK, logs, total, limit, offset)
}
