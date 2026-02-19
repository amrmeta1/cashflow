package http

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/domain"
	"github.com/finch-co/cashflow/internal/usecase"
)

type TenantHandler struct {
	uc *usecase.TenantUseCase
}

func NewTenantHandler(uc *usecase.TenantUseCase) *TenantHandler {
	return &TenantHandler{uc: uc}
}

func (h *TenantHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input domain.CreateTenantInput
	if err := decodeJSON(r, &input); err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	tenant, err := h.uc.Create(r.Context(), input)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, tenant)
}

func (h *TenantHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	tenant, err := h.uc.GetByID(r.Context(), id)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	writeJSON(w, http.StatusOK, tenant)
}

func (h *TenantHandler) List(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	tenants, total, err := h.uc.List(r.Context(), limit, offset)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	writeJSONList(w, http.StatusOK, tenants, total, limit, offset)
}

func (h *TenantHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	var input domain.UpdateTenantInput
	if err := decodeJSON(r, &input); err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	tenant, err := h.uc.Update(r.Context(), id, input)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	writeJSON(w, http.StatusOK, tenant)
}

func (h *TenantHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	if err := h.uc.Delete(r.Context(), id); err != nil {
		writeErrorResponse(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
