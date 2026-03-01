package http

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/domain"
	"github.com/finch-co/cashflow/internal/usecase"
)

type MemberHandler struct {
	uc *usecase.MemberUseCase
}

func NewMemberHandler(uc *usecase.MemberUseCase) *MemberHandler {
	return &MemberHandler{uc: uc}
}

// GetProfile — GET /me
func (h *MemberHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	user, err := h.uc.GetProfile(r.Context())
	if err != nil {
		writeErrorResponse(w, err)
		return
	}
	writeJSON(w, http.StatusOK, user)
}

// AddMember — POST /tenants/{tenantID}/members
func (h *MemberHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		writeErrorResponse(w, domain.ErrValidation)
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

// ListMembers — GET /tenants/{tenantID}/members
func (h *MemberHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	tenantID, err := uuid.Parse(chi.URLParam(r, "tenantID"))
	if err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	members, total, err := h.uc.ListMembers(r.Context(), tenantID, limit, offset)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}
	writeJSONList(w, http.StatusOK, members, total, limit, offset)
}

// ChangeMemberRole — POST /tenants/{tenantID}/roles  (changes a member's role)
func (h *MemberHandler) ChangeMemberRole(w http.ResponseWriter, r *http.Request) {
	var body struct {
		MembershipID uuid.UUID `json:"membership_id"`
		Role         string    `json:"role"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	membership, err := h.uc.ChangeMemberRole(r.Context(), body.MembershipID, body.Role)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}
	writeJSON(w, http.StatusOK, membership)
}

// RemoveMember — DELETE /tenants/{tenantID}/members/{membershipID}
func (h *MemberHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
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
