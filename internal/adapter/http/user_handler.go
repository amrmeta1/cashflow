package http

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/domain"
	"github.com/finch-co/cashflow/internal/usecase"
)

type UserHandler struct {
	uc *usecase.UserUseCase
}

func NewUserHandler(uc *usecase.UserUseCase) *UserHandler {
	return &UserHandler{uc: uc}
}

func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	user, err := h.uc.GetProfile(r.Context())
	if err != nil {
		writeErrorResponse(w, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (h *UserHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "userID"))
	if err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	user, err := h.uc.GetByID(r.Context(), id)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (h *UserHandler) ListByTenant(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := domain.TenantIDFromContext(r.Context())
	if !ok {
		writeErrorResponse(w, domain.ErrTenantRequired)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	users, total, err := h.uc.ListByTenant(r.Context(), tenantID, limit, offset)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}
	writeJSONList(w, http.StatusOK, users, total, limit, offset)
}

func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "userID"))
	if err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	var input domain.UpdateUserInput
	if err := decodeJSON(r, &input); err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	user, err := h.uc.Update(r.Context(), id, input)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "userID"))
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

func (h *UserHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := domain.TenantIDFromContext(r.Context())
	if !ok {
		writeErrorResponse(w, domain.ErrTenantRequired)
		return
	}

	var input domain.CreateMembershipInput
	if err := decodeJSON(r, &input); err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	membership, err := h.uc.AddMember(r.Context(), tenantID, input)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, membership)
}

func (h *UserHandler) ChangeMemberRole(w http.ResponseWriter, r *http.Request) {
	membershipID, err := uuid.Parse(chi.URLParam(r, "membershipID"))
	if err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	var body struct {
		RoleID uuid.UUID `json:"role_id"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	membership, err := h.uc.ChangeMemberRole(r.Context(), membershipID, body.RoleID)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}
	writeJSON(w, http.StatusOK, membership)
}

func (h *UserHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	membershipID, err := uuid.Parse(chi.URLParam(r, "membershipID"))
	if err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	if err := h.uc.RemoveMember(r.Context(), membershipID); err != nil {
		writeErrorResponse(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
