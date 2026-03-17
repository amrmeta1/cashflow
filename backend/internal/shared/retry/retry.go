package retry

import (
	"context"
	"fmt"
	"time"

	"github.com/rs/zerolog/log"
)

// Config holds retry configuration.
type Config struct {
	MaxAttempts int
	InitialDelay time.Duration
	MaxDelay     time.Duration
	Multiplier   float64
}

// DefaultConfig returns sensible defaults for retry configuration.
func DefaultConfig() Config {
	return Config{
		MaxAttempts:  3,
		InitialDelay: 100 * time.Millisecond,
		MaxDelay:     5 * time.Second,
		Multiplier:   2.0,
	}
}

// Do executes the given function with exponential backoff retry logic.
// It returns the result of the function or the last error encountered.
func Do(ctx context.Context, cfg Config, fn func() error) error {
	var lastErr error
	delay := cfg.InitialDelay

	for attempt := 1; attempt <= cfg.MaxAttempts; attempt++ {
		// Check context cancellation
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		// Execute function
		err := fn()
		if err == nil {
			if attempt > 1 {
				log.Debug().
					Int("attempt", attempt).
					Msg("operation succeeded after retry")
			}
			return nil
		}

		lastErr = err

		// Don't retry on last attempt
		if attempt == cfg.MaxAttempts {
			break
		}

		// Log retry attempt
		log.Warn().
			Err(err).
			Int("attempt", attempt).
			Int("max_attempts", cfg.MaxAttempts).
			Dur("delay", delay).
			Msg("operation failed, retrying")

		// Wait before retry
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay):
		}

		// Calculate next delay with exponential backoff
		delay = time.Duration(float64(delay) * cfg.Multiplier)
		if delay > cfg.MaxDelay {
			delay = cfg.MaxDelay
		}
	}

	return fmt.Errorf("operation failed after %d attempts: %w", cfg.MaxAttempts, lastErr)
}

// DoWithResult executes the given function with retry logic and returns a result.
func DoWithResult[T any](ctx context.Context, cfg Config, fn func() (T, error)) (T, error) {
	var result T
	var lastErr error
	delay := cfg.InitialDelay

	for attempt := 1; attempt <= cfg.MaxAttempts; attempt++ {
		// Check context cancellation
		select {
		case <-ctx.Done():
			return result, ctx.Err()
		default:
		}

		// Execute function
		res, err := fn()
		if err == nil {
			if attempt > 1 {
				log.Debug().
					Int("attempt", attempt).
					Msg("operation succeeded after retry")
			}
			return res, nil
		}

		lastErr = err

		// Don't retry on last attempt
		if attempt == cfg.MaxAttempts {
			break
		}

		// Log retry attempt
		log.Warn().
			Err(err).
			Int("attempt", attempt).
			Int("max_attempts", cfg.MaxAttempts).
			Dur("delay", delay).
			Msg("operation failed, retrying")

		// Wait before retry
		select {
		case <-ctx.Done():
			return result, ctx.Err()
		case <-time.After(delay):
		}

		// Calculate next delay with exponential backoff
		delay = time.Duration(float64(delay) * cfg.Multiplier)
		if delay > cfg.MaxDelay {
			delay = cfg.MaxDelay
		}
	}

	return result, fmt.Errorf("operation failed after %d attempts: %w", cfg.MaxAttempts, lastErr)
}

// IsRetryable determines if an error should be retried.
// By default, all errors are retryable unless explicitly marked as non-retryable.
type IsRetryableFunc func(error) bool

// DoWithRetryable executes with custom retry logic based on error type.
func DoWithRetryable(ctx context.Context, cfg Config, isRetryable IsRetryableFunc, fn func() error) error {
	var lastErr error
	delay := cfg.InitialDelay

	for attempt := 1; attempt <= cfg.MaxAttempts; attempt++ {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		err := fn()
		if err == nil {
			return nil
		}

		lastErr = err

		// Check if error is retryable
		if !isRetryable(err) {
			log.Debug().
				Err(err).
				Msg("error is not retryable, stopping")
			return err
		}

		if attempt == cfg.MaxAttempts {
			break
		}

		log.Warn().
			Err(err).
			Int("attempt", attempt).
			Dur("delay", delay).
			Msg("retryable error, retrying")

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay):
		}

		delay = time.Duration(float64(delay) * cfg.Multiplier)
		if delay > cfg.MaxDelay {
			delay = cfg.MaxDelay
		}
	}

	return fmt.Errorf("operation failed after %d attempts: %w", cfg.MaxAttempts, lastErr)
}
