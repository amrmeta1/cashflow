package operations

import (
	"github.com/go-chi/chi/v5"
)

// RouterDeps holds dependencies for the operations module router
type RouterDeps struct {
	Ingestion *IngestionHandler
}

// NewRouter creates a new router for the operations module
// Routes are mounted under /api/v1/operations
func NewRouter(deps RouterDeps) chi.Router {
	r := chi.NewRouter()

	// CSV import
	r.Post("/imports/bank-csv", deps.Ingestion.ImportBankCSV)

	// Transactions
	r.Get("/transactions", deps.Ingestion.ListTransactions)

	// Bank accounts
	r.Post("/bank-accounts", deps.Ingestion.CreateBankAccount)

	// Sync commands
	r.Post("/sync/bank", deps.Ingestion.SyncBank)
	r.Post("/sync/accounting", deps.Ingestion.SyncAccounting)

	// Future: Payables management
	// r.Get("/payables", deps.Payables.List)

	return r
}
