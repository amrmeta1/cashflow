package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/finch-co/cashflow/internal/domain"
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

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(APIResponse{Data: data})
}

func writeJSONList(w http.ResponseWriter, status int, data any, total, limit, offset int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(APIResponse{
		Data: data,
		Meta: &Meta{Total: total, Limit: limit, Offset: offset},
	})
}

func writeErrorResponse(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	message := "internal server error"

	switch {
	case errors.Is(err, domain.ErrNotFound):
		status = http.StatusNotFound
		message = "resource not found"
	case errors.Is(err, domain.ErrConflict):
		status = http.StatusConflict
		message = "resource already exists"
	case errors.Is(err, domain.ErrUnauthorized):
		status = http.StatusUnauthorized
		message = "unauthorized"
	case errors.Is(err, domain.ErrForbidden):
		status = http.StatusForbidden
		message = "forbidden"
	case errors.Is(err, domain.ErrValidation):
		status = http.StatusBadRequest
		message = err.Error()
	case errors.Is(err, domain.ErrInvalidCredentials):
		status = http.StatusUnauthorized
		message = "invalid credentials"
	case errors.Is(err, domain.ErrTenantRequired):
		status = http.StatusBadRequest
		message = "tenant context required"
	default:
		message = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(APIResponse{Error: message})
}

func decodeJSON(r *http.Request, v any) error {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		return err
	}
	return nil
}
