package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/config"
	"github.com/finch-co/cashflow/internal/db"
	"github.com/finch-co/cashflow/internal/db/repositories"
	"github.com/finch-co/cashflow/internal/events"
	"github.com/finch-co/cashflow/internal/ingestion/service"
	"github.com/finch-co/cashflow/internal/observability"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	if err := run(); err != nil {
		log.Fatal().Err(err).Msg("application failed")
	}
}

func run() error {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Load config
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	// Init OpenTelemetry
	shutdownTracer, err := observability.InitTracer(ctx, cfg.OTEL)
	if err != nil {
		return fmt.Errorf("initializing tracer: %w", err)
	}
	defer shutdownTracer(ctx)

	// Connect to database
	pool, err := db.NewPool(ctx, cfg.Database)
	if err != nil {
		return fmt.Errorf("connecting to database: %w", err)
	}
	defer pool.Close()
	log.Info().Str("host", cfg.Database.Host).Int("port", cfg.Database.Port).Msg("connected to database")

	// Initialize repositories
	bankAccountRepo := repositories.NewBankAccountRepo(pool)
	rawTxnRepo := repositories.NewRawBankTransactionRepo(pool)
	txnRepo := repositories.NewBankTransactionRepo(pool)
	jobRepo := repositories.NewIngestionJobRepo(pool)
	vendorRepo := repositories.NewVendorRepo(pool)

	// Connect to NATS
	var publisher *events.Publisher
	if cfg.NATS.URL != "" {
		nc, err := nats.Connect(cfg.NATS.URL)
		if err != nil {
			return fmt.Errorf("connecting to NATS: %w", err)
		}
		defer nc.Close()

		js, err := jetstream.New(nc)
		if err != nil {
			return fmt.Errorf("creating jetstream: %w", err)
		}

		// Ensure stream exists
		_, err = js.CreateOrUpdateStream(ctx, jetstream.StreamConfig{
			Name:      events.StreamCashflow,
			Subjects:  []string{events.SubjectTransactionsImported},
			Storage:   jetstream.FileStorage,
			Retention: jetstream.WorkQueuePolicy,
		})
		if err != nil {
			log.Warn().Err(err).Msg("stream may already exist")
		}

		publisher = events.NewPublisher(js)
		log.Info().Str("url", cfg.NATS.URL).Msg("connected to NATS")
	} else {
		log.Warn().Msg("NATS disabled - events will not be published")
	}

	// Create NEW ingestion service
	ingestionService := service.NewIngestionService(
		bankAccountRepo,
		rawTxnRepo,
		txnRepo,
		jobRepo,
		vendorRepo,
		publisher,
	)

	log.Info().Msg("✓ New ingestion service initialized")

	// Create HTTP handlers
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
	})

	// CSV import endpoint
	mux.HandleFunc("POST /api/v1/tenants/{tenantID}/imports/csv", handleCSVImport(ingestionService))

	// PDF import endpoint
	mux.HandleFunc("POST /api/v1/tenants/{tenantID}/imports/pdf", handlePDFImport(ingestionService))

	// Metrics endpoint
	mux.Handle("/metrics", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prometheus metrics will be exposed here
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("# Metrics endpoint - integrate with prometheus handler\n"))
	}))

	// Start HTTP server
	srv := &http.Server{
		Addr:         cfg.Server.Addr(),
		Handler:      mux,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Info().Str("addr", srv.Addr).Msg("starting HTTP server")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return fmt.Errorf("server error: %w", err)
	case sig := <-quit:
		log.Info().Str("signal", sig.String()).Msg("shutting down")
	}

	shutdownCtx, shutdownCancel := context.WithTimeout(ctx, 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown failed: %w", err)
	}

	log.Info().Msg("server stopped gracefully")
	return nil
}

// handleCSVImport creates a handler for CSV file uploads
func handleCSVImport(svc *service.IngestionService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Parse multipart form (50MB max)
		if err := r.ParseMultipartForm(50 << 20); err != nil {
			log.Error().Err(err).Msg("failed to parse form")
			writeError(w, http.StatusBadRequest, "failed to parse form", err)
			return
		}

		// Get file
		file, header, err := r.FormFile("file")
		if err != nil {
			log.Error().Err(err).Msg("failed to get file")
			writeError(w, http.StatusBadRequest, "failed to get file", err)
			return
		}
		defer file.Close()

		// Parse tenant ID
		tenantIDStr := r.PathValue("tenantID")
		tenantID, err := uuid.Parse(tenantIDStr)
		if err != nil {
			log.Error().Err(err).Str("tenant_id", tenantIDStr).Msg("invalid tenant ID")
			writeError(w, http.StatusBadRequest, "invalid tenant ID", err)
			return
		}

		// Parse account ID (from form or use default)
		accountIDStr := r.FormValue("account_id")
		var accountID uuid.UUID
		if accountIDStr != "" {
			accountID, err = uuid.Parse(accountIDStr)
			if err != nil {
				log.Error().Err(err).Str("account_id", accountIDStr).Msg("invalid account ID")
				writeError(w, http.StatusBadRequest, "invalid account ID", err)
				return
			}
		} else {
			// TODO: Get or create default account for tenant
			accountID = uuid.New()
		}

		// Call ingestion service
		log.Info().
			Str("tenant_id", tenantID.String()).
			Str("account_id", accountID.String()).
			Str("file_name", header.Filename).
			Int64("file_size", header.Size).
			Msg("processing CSV import")

		result, err := svc.ImportCSV(
			r.Context(),
			tenantID,
			accountID,
			file,
			header.Filename,
		)

		if err != nil {
			log.Error().
				Err(err).
				Str("tenant_id", tenantID.String()).
				Msg("CSV import failed")
			writeError(w, http.StatusInternalServerError, "import failed", err)
			return
		}

		// Return success response
		writeSuccess(w, map[string]interface{}{
			"job_id":                result.JobID.String(),
			"total_rows":            result.TotalRows,
			"transactions_parsed":   result.TransactionsParsed,
			"transactions_inserted": result.TransactionsInserted,
			"duplicates":            result.Duplicates,
			"document_type":         result.DocumentType,
			"duration_ms":           result.Duration.Milliseconds(),
			"errors":                result.Errors,
		})

		log.Info().
			Str("job_id", result.JobID.String()).
			Int("inserted", result.TransactionsInserted).
			Dur("duration", result.Duration).
			Msg("CSV import completed")
	}
}

// handlePDFImport creates a handler for PDF file uploads
func handlePDFImport(svc *service.IngestionService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseMultipartForm(50 << 20); err != nil {
			writeError(w, http.StatusBadRequest, "failed to parse form", err)
			return
		}

		file, header, err := r.FormFile("file")
		if err != nil {
			writeError(w, http.StatusBadRequest, "failed to get file", err)
			return
		}
		defer file.Close()

		tenantIDStr := r.PathValue("tenantID")
		tenantID, err := uuid.Parse(tenantIDStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid tenant ID", err)
			return
		}

		accountIDStr := r.FormValue("account_id")
		accountID, err := uuid.Parse(accountIDStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid account ID", err)
			return
		}

		log.Info().
			Str("tenant_id", tenantID.String()).
			Str("file_name", header.Filename).
			Msg("processing PDF import")

		result, err := svc.ImportPDF(
			r.Context(),
			tenantID,
			accountID,
			file,
			header.Filename,
		)

		if err != nil {
			log.Error().Err(err).Msg("PDF import failed")
			writeError(w, http.StatusInternalServerError, "import failed", err)
			return
		}

		writeSuccess(w, map[string]interface{}{
			"job_id":                result.JobID.String(),
			"transactions_inserted": result.TransactionsInserted,
			"duration_ms":           result.Duration.Milliseconds(),
		})
	}
}

// writeError writes an error response
func writeError(w http.ResponseWriter, statusCode int, message string, err error) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error":   err.Error(),
		"message": message,
	})
}

// writeSuccess writes a success response
func writeSuccess(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    data,
	})
}
