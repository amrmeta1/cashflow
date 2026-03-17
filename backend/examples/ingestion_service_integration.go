package examples

// This file shows how to integrate the new ingestion service into main.go
// Copy the relevant parts to cmd/ingestion-service/main.go or your main service file

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/config"
	"github.com/finch-co/cashflow/internal/db"
	"github.com/finch-co/cashflow/internal/db/repositories"
	"github.com/finch-co/cashflow/internal/events"
	"github.com/finch-co/cashflow/internal/ingestion/service"
)

// IntegrateIngestionService shows how to set up the new ingestion service
func IntegrateIngestionService() error {
	ctx := context.Background()

	// 1. Load configuration
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	// 2. Connect to database
	pool, err := db.NewPool(ctx, cfg.Database)
	if err != nil {
		return fmt.Errorf("connecting to database: %w", err)
	}
	defer pool.Close()

	// 3. Initialize repositories
	bankAccountRepo := repositories.NewBankAccountRepo(pool)
	rawTxnRepo := repositories.NewRawBankTransactionRepo(pool)
	txnRepo := repositories.NewBankTransactionRepo(pool)
	jobRepo := repositories.NewIngestionJobRepo(pool)
	vendorRepo := repositories.NewVendorRepo(pool)

	// 4. Connect to NATS
	nc, err := nats.Connect(cfg.NATS.URL)
	if err != nil {
		return fmt.Errorf("connecting to NATS: %w", err)
	}
	defer nc.Close()

	// 5. Create JetStream context
	js, err := jetstream.New(nc)
	if err != nil {
		return fmt.Errorf("creating jetstream: %w", err)
	}

	// 6. Create or get stream
	_, err = js.CreateOrUpdateStream(ctx, jetstream.StreamConfig{
		Name:      events.StreamCashflow,
		Subjects:  []string{events.SubjectTransactionsImported},
		Storage:   jetstream.FileStorage,
		Retention: jetstream.WorkQueuePolicy,
	})
	if err != nil {
		return fmt.Errorf("creating stream: %w", err)
	}

	// 7. Create event publisher
	publisher := events.NewPublisher(js)

	log.Info().Msg("✓ New ingestion service initialized")

	// Create NEW ingestion service
	_ = service.NewIngestionService(
		bankAccountRepo,
		rawTxnRepo,
		txnRepo,
		jobRepo,
		vendorRepo,
		publisher,
	)

	log.Info().Msg("✓ New ingestion service initialized")

	// 9. Create HTTP handlers (see handlers example)
	mux := http.NewServeMux()

	// Example handler
	mux.HandleFunc("/api/v1/tenants/{tenantID}/imports/csv", func(w http.ResponseWriter, r *http.Request) {
		// Parse multipart form
		if err := r.ParseMultipartForm(50 << 20); err != nil { // 50MB max
			http.Error(w, "failed to parse form", http.StatusBadRequest)
			return
		}

		file, _, err := r.FormFile("file")
		if err != nil {
			http.Error(w, "failed to get file", http.StatusBadRequest)
			return
		}
		defer file.Close()

		// Get tenant and account IDs from request
		// tenantID := ... (parse from path)
		// accountID := ... (parse from form or default)

		// Call NEW ingestion service
		// result, err := ingestionService.ImportCSV(
		// 	r.Context(),
		// 	tenantID,
		// 	accountID,
		// 	file,
		// 	header.Filename,
		// )

		// Return result
		// json.NewEncoder(w).Encode(result)
	})

	// 10. Start HTTP server
	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Server.Port),
		Handler: mux,
	}

	// 11. Graceful shutdown
	go func() {
		log.Info().Int("port", cfg.Server.Port).Msg("ingestion service started")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server failed")
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("server forced to shutdown")
	}

	log.Info().Msg("server exited")
	return nil
}

// Example helper functions for gradual migration (for reference only)

// withFeatureFlag wraps handlers with a feature flag for gradual migration
// Example helper function - not used in this integration example
func withFeatureFlag(useNew bool, oldHandler, newHandler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if useNew {
			newHandler(w, r)
		} else {
			oldHandler(w, r)
		}
	}
}

// withTenantMigration wraps handlers with tenant-based migration logic
// Example helper function - not used in this integration example
func withTenantMigration(_ map[string]bool, _ http.HandlerFunc, _ http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract tenant ID from request
		// tenantID := extractTenantID(r)

		// if newArchitectureTenants[tenantID] {
		// 	newHandler(w, r)
		// } else {
		// 	oldHandler(w, r)
		// }
	}
}
