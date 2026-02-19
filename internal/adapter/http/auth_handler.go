package http

import (
	"net/http"

	"github.com/finch-co/cashflow/internal/usecase"
)

type AuthHandler struct {
	uc *usecase.AuthUseCase
}

func NewAuthHandler(uc *usecase.AuthUseCase) *AuthHandler {
	return &AuthHandler{uc: uc}
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var input usecase.LoginInput
	if err := decodeJSON(r, &input); err != nil {
		writeErrorResponse(w, err)
		return
	}

	tokens, err := h.uc.Login(r.Context(), input, r.RemoteAddr, r.UserAgent())
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	writeJSON(w, http.StatusOK, tokens)
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var input usecase.RegisterInput
	if err := decodeJSON(r, &input); err != nil {
		writeErrorResponse(w, err)
		return
	}

	user, err := h.uc.Register(r.Context(), input, r.RemoteAddr, r.UserAgent())
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, user)
}
