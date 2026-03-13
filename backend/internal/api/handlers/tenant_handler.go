package handlers

import (
	"net/http"

	"github.com/finch-co/cashflow/internal/enterprise"
	"github.com/finch-co/cashflow/internal/models"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type TenantHandler struct {
	uc *enterprise.TenantUseCase
}

func NewTenantHandler(uc *enterprise.TenantUseCase) *TenantHandler {
	return &TenantHandler{uc: uc}
}

func (h *TenantHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input models.CreateTenantInput
	if err := DecodeJSON(r, &input); err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	tenant, err := h.uc.Create(r.Context(), input)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}

	WriteJSON(w, http.StatusCreated, tenant)
}

func (h *TenantHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "tenantID")
	id, err := uuid.Parse(idStr)
	if err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	tenant, err := h.uc.GetByID(r.Context(), id)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, tenant)
}
