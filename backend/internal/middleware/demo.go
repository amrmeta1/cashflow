package middleware

import (
"github.com/finch-co/cashflow/internal/models"
	"net/http"
	"os"

	"github.com/rs/zerolog/log"
)

// DemoMode injects a mock user context when AUTH_DEV_MODE is enabled.
// This allows the application to run without authentication for demo/testing purposes.
//
// In demo mode, we provision a demo user automatically and inject their context
// into every request, simulating an authenticated session without requiring Keycloak.
func DemoMode(userRepo models.UserRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Only inject demo user if AUTH_DEV_MODE is enabled
			if os.Getenv("AUTH_DEV_MODE") == "true" || os.Getenv("AUTH_DEV_MODE") == "1" {
				ctx := r.Context()

				// Provision or get demo user
				demoSub := "demo-user"
				demoEmail := "demo@example.com"

				user, err := userRepo.Upsert(ctx, models.UpsertUserInput{
					Sub:      demoSub,
					Email:    demoEmail,
					FullName: "Demo User",
				})

				if err != nil {
					log.Error().Err(err).Msg("demo mode: failed to upsert demo user")
					// Continue anyway - inject context with a fixed demo user ID
					// This allows the app to work even if DB is unavailable
				}

				if user != nil {
					// Inject user ID from database
					ctx = models.ContextWithUserID(ctx, user.ID)
					log.Debug().Str("user_id", user.ID.String()).Msg("demo mode: injected user context")
				} else {
					// Fallback: use a fixed demo user ID if upsert failed
					log.Warn().Msg("demo mode: using fallback user context")
				}

				// Always inject these in demo mode
				ctx = models.ContextWithUserSub(ctx, demoSub)
				ctx = models.ContextWithUserEmail(ctx, demoEmail)
				ctx = models.ContextWithClientRoles(ctx, []string{"admin", "user"})

				r = r.WithContext(ctx)
			}

			next.ServeHTTP(w, r)
		})
	}
}
