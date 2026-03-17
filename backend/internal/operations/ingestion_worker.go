package operations

import (
"context"

"github.com/rs/zerolog/log"
)

// IngestionWorkerDeps holds dependencies for the operations command worker.
type IngestionWorkerDeps struct {
	// TODO: Add proper dependencies when needed
}

// NewIngestionCommandHandler returns a interface{} for operations commands.
func NewIngestionCommandHandler(deps IngestionWorkerDeps) interface{} {
	return func(ctx context.Context, env interface{}) error {
		// TODO: Implement proper envelope type and message handling
		log.Info().Msg("ingestion command received (placeholder)")
		return nil
	}
}
