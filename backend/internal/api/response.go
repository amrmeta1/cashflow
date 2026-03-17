package api

import (
	"encoding/json"
	"net/http"

	"github.com/rs/zerolog/log"
)

// StandardResponse represents a consistent API response format
type StandardResponse struct {
	Status  string      `json:"status"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

// RespondJSON sends a JSON response with standard format
func RespondJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	response := StandardResponse{
		Status: "success",
		Data:   data,
	}
	
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Error().Err(err).Msg("failed to encode JSON response")
	}
}

// RespondError sends an error response with standard format
func RespondError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	status := "error"
	if statusCode >= 500 {
		status = "server_error"
	} else if statusCode >= 400 {
		status = "client_error"
	}
	
	response := StandardResponse{
		Status: status,
		Error:  message,
	}
	
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Error().Err(err).Msg("failed to encode error response")
	}
}

// RespondWithMessage sends a success response with a message
func RespondWithMessage(w http.ResponseWriter, statusCode int, message string, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	response := StandardResponse{
		Status:  "success",
		Message: message,
		Data:    data,
	}
	
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Error().Err(err).Msg("failed to encode JSON response")
	}
}
