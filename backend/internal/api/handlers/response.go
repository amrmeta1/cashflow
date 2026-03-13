package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/finch-co/cashflow/internal/models"
)

type APIResponse struct {
	Data  any    `json:"data,omitempty"`
	Error string `json:"error,omitempty"`
	Meta  *Meta  `json:"meta,omitempty"`
}

type Meta struct {
	Total  int `json:"total"`
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

func WriteJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(APIResponse{Data: data})
}

func WriteJSONList(w http.ResponseWriter, status int, data any, total, limit, offset int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(APIResponse{
		Data: data,
		Meta: &Meta{Total: total, Limit: limit, Offset: offset},
	})
}

func WriteErrorResponse(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	message := "internal server error"

	switch {
	case errors.Is(err, models.ErrNotFound):
		status = http.StatusNotFound
		message = "resource not found"
	case errors.Is(err, models.ErrConflict):
		status = http.StatusConflict
		message = "resource already exists"
	case errors.Is(err, models.ErrUnauthorized):
		status = http.StatusUnauthorized
		message = "unauthorized"
	case errors.Is(err, models.ErrForbidden):
		status = http.StatusForbidden
		message = "forbidden"
	case errors.Is(err, models.ErrValidation):
		status = http.StatusBadRequest
		message = err.Error()
	case errors.Is(err, models.ErrInvalidCredentials):
		status = http.StatusUnauthorized
		message = "invalid credentials"
	case errors.Is(err, models.ErrTenantRequired):
		status = http.StatusBadRequest
		message = "tenant context required"
	default:
		message = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(APIResponse{Error: message})
}

func DecodeJSON(r *http.Request, v any) error {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		return err
	}
	return nil
}
