package embeddings

import (
	"context"
	"fmt"
	"math"
	"time"
)

// RetryConfig holds retry configuration
type RetryConfig struct {
	MaxRetries int
	BaseDelay  time.Duration
}

// DefaultRetryConfig returns sensible defaults for API retries
func DefaultRetryConfig() RetryConfig {
	return RetryConfig{
		MaxRetries: 3,
		BaseDelay:  1 * time.Second,
	}
}

// RetryableError indicates whether an error should be retried
type RetryableError struct {
	Err        error
	Retryable  bool
	StatusCode int
}

func (e *RetryableError) Error() string {
	return e.Err.Error()
}

// IsRetryable determines if an HTTP status code should trigger a retry
func IsRetryable(statusCode int) bool {
	// Retry on rate limits and server errors
	if statusCode == 429 { // Too Many Requests
		return true
	}
	if statusCode >= 500 && statusCode < 600 { // Server errors
		return true
	}
	return false
}

// RetryWithBackoff executes a function with exponential backoff retry logic
func RetryWithBackoff(ctx context.Context, cfg RetryConfig, fn func() error) error {
	var lastErr error

	for attempt := 0; attempt <= cfg.MaxRetries; attempt++ {
		// Check context before attempting
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		// Execute the function
		err := fn()
		if err == nil {
			return nil
		}

		lastErr = err

		// Check if error is retryable
		if retryErr, ok := err.(*RetryableError); ok {
			if !retryErr.Retryable {
				return err
			}
		}

		// Don't sleep after the last attempt
		if attempt == cfg.MaxRetries {
			break
		}

		// Calculate backoff delay: baseDelay * 2^attempt
		delay := time.Duration(float64(cfg.BaseDelay) * math.Pow(2, float64(attempt)))
		
		// Cap maximum delay at 30 seconds
		if delay > 30*time.Second {
			delay = 30 * time.Second
		}

		// Wait with context awareness
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay):
			// Continue to next attempt
		}
	}

	return fmt.Errorf("max retries (%d) exceeded: %w", cfg.MaxRetries, lastErr)
}
