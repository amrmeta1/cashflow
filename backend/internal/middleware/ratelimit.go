package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/finch-co/cashflow/internal/domain"
)

type tenantWindow struct {
	windowStart time.Time
	count       int
}

// TenantRateLimit limits requests per tenant in a fixed time window.
// This limiter is in-memory per service instance.
func TenantRateLimit(limit int, window time.Duration) func(http.Handler) http.Handler {
	var (
		mu      sync.Mutex
		windows = make(map[string]tenantWindow)
	)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tenantID, ok := domain.TenantIDFromContext(r.Context())
			if !ok {
				writeError(w, http.StatusForbidden, "tenant context required")
				return
			}

			now := time.Now().UTC()
			key := tenantID.String()

			mu.Lock()
			state := windows[key]
			if state.windowStart.IsZero() || now.Sub(state.windowStart) >= window {
				state.windowStart = now
				state.count = 0
			}

			if state.count >= limit {
				retryAfter := int(window.Seconds())
				if retryAfter <= 0 {
					retryAfter = 60
				}
				mu.Unlock()
				w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
				writeError(w, http.StatusTooManyRequests, "rate limit exceeded for tenant")
				return
			}

			state.count++
			windows[key] = state
			mu.Unlock()

			next.ServeHTTP(w, r)
		})
	}
}
