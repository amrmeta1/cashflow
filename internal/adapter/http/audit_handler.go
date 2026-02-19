package http

import (
	"net/http"
	"strconv"

	"github.com/finch-co/cashflow/internal/domain"
)

type AuditHandler struct {
	audit domain.AuditLogRepository
}

func NewAuditHandler(audit domain.AuditLogRepository) *AuditHandler {
	return &AuditHandler{audit: audit}
}

func (h *AuditHandler) ListByTenant(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := domain.TenantIDFromContext(r.Context())
	if !ok {
		writeErrorResponse(w, domain.ErrTenantRequired)
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

	logs, total, err := h.audit.ListByTenant(r.Context(), tenantID, limit, offset)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	writeJSONList(w, http.StatusOK, logs, total, limit, offset)
}
