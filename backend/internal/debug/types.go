package debug

import "time"

// CheckResult represents the result of a diagnostic check
type CheckResult struct {
	Name        string        `json:"name"`
	Status      string        `json:"status"` // "pass", "fail", "warn"
	Message     string        `json:"message"`
	Details     interface{}   `json:"details,omitempty"`
	Suggestions []string      `json:"suggestions,omitempty"`
	Duration    time.Duration `json:"duration"`
	Timestamp   time.Time     `json:"timestamp"`
}

// DiagnosticReport contains all diagnostic results
type DiagnosticReport struct {
	Timestamp     time.Time     `json:"timestamp"`
	Environment   string        `json:"environment"`
	Version       string        `json:"version"`
	Checks        []CheckResult `json:"checks"`
	Summary       Summary       `json:"summary"`
	TotalDuration time.Duration `json:"total_duration"`
}

// Summary provides an overview of check results
type Summary struct {
	Total   int  `json:"total"`
	Passed  int  `json:"passed"`
	Failed  int  `json:"failed"`
	Warned  int  `json:"warned"`
	Healthy bool `json:"healthy"`
}

// Checker interface for all diagnostic checks
type Checker interface {
	Name() string
	Check() CheckResult
}
