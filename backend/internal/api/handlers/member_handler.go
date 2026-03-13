package handlers

import (
	"net/http"
	"strconv"

	"github.com/finch-co/cashflow/internal/enterprise"
	"github.com/finch-co/cashflow/internal/models"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type MemberHandler struct {
	uc *enterprise.MemberUseCase
}

func NewMemberHandler(uc *enterprise.MemberUseCase) *MemberHandler {
	return &MemberHandler{uc: uc}
}

func (h *MemberHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	user, err := h.uc.GetProfile(r.Context())
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, user)
}

func (h *MemberHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	tenantIDStr := chi.URLParam(r, "tenantID")
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	var input models.CreateMembershipInput
	if err := DecodeJSON(r, &input); err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	membership, err := h.uc.AddMember(r.Context(), tenantID, input)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}

	WriteJSON(w, http.StatusCreated, membership)
}

func (h *MemberHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	tenantIDStr := chi.URLParam(r, "tenantID")
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	members, total, err := h.uc.ListMembers(r.Context(), tenantID, limit, offset)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}

	WriteJSONList(w, http.StatusOK, members, total, limit, offset)
}

func (h *MemberHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	membershipIDStr := chi.URLParam(r, "membershipID")
	membershipID, err := uuid.Parse(membershipIDStr)
	if err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	if err := h.uc.RemoveMember(r.Context(), membershipID); err != nil {
		WriteErrorResponse(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *MemberHandler) ChangeMemberRole(w http.ResponseWriter, r *http.Request) {
	var input struct {
		MembershipID string `json:"membership_id"`
		Role         string `json:"role"`
	}
	if err := DecodeJSON(r, &input); err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	membershipID, err := uuid.Parse(input.MembershipID)
	if err != nil {
		WriteErrorResponse(w, models.ErrValidation)
		return
	}

	membership, err := h.uc.ChangeMemberRole(r.Context(), membershipID, input.Role)
	if err != nil {
		WriteErrorResponse(w, err)
		return
	}

	WriteJSON(w, http.StatusOK, membership)
}
