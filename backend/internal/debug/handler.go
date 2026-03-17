package debug

import (
	"encoding/json"
	"net/http"
)

// Handler provides HTTP endpoints for diagnostics
type Handler struct {
	runner *Runner
}

// NewHandler creates a new debug handler
func NewHandler(verbose bool) *Handler {
	return &Handler{
		runner: DefaultRunner(verbose),
	}
}

// StatusHandler returns diagnostic status as JSON
func (h *Handler) StatusHandler(w http.ResponseWriter, r *http.Request) {
	report := h.runner.RunAll()

	w.Header().Set("Content-Type", "application/json")

	// Set status code based on health
	if !report.Summary.Healthy {
		w.WriteHeader(http.StatusServiceUnavailable)
	} else {
		w.WriteHeader(http.StatusOK)
	}

	json.NewEncoder(w).Encode(report)
}

// SimpleStatusHandler returns simplified status
func (h *Handler) SimpleStatusHandler(w http.ResponseWriter, r *http.Request) {
	report := h.runner.RunAll()

	response := map[string]interface{}{
		"server":          getStatusString(report, "Server Configuration"),
		"health":          getStatusString(report, "Health Endpoint"),
		"frontend_assets": getStatusString(report, "Frontend Assets"),
		"api_connection":  getStatusString(report, "API Connectivity Configuration"),
		"docker_image":    getStatusString(report, "Docker Image Content"),
		"kubernetes":      getStatusString(report, "Kubernetes Runtime"),
		"overall_healthy": report.Summary.Healthy,
		"timestamp":       report.Timestamp,
	}

	w.Header().Set("Content-Type", "application/json")

	if !report.Summary.Healthy {
		w.WriteHeader(http.StatusServiceUnavailable)
	} else {
		w.WriteHeader(http.StatusOK)
	}

	json.NewEncoder(w).Encode(response)
}

func getStatusString(report DiagnosticReport, checkName string) string {
	for _, check := range report.Checks {
		if check.Name == checkName {
			return check.Status
		}
	}
	return "unknown"
}
