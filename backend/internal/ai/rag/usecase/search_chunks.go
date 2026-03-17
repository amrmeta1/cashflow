package usecase

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/ai/rag/embeddings"
	"github.com/finch-co/cashflow/internal/ai/rag/domain"
)

// SearchChunksUseCase handles semantic search over document chunks
type SearchChunksUseCase struct {
	chunkRepo        domain.ChunkRepository
	embeddingsClient embeddings.EmbeddingsClient
}

// NewSearchChunksUseCase creates a new semantic search use case
func NewSearchChunksUseCase(
	chunkRepo domain.ChunkRepository,
	embeddingsClient embeddings.EmbeddingsClient,
) *SearchChunksUseCase {
	return &SearchChunksUseCase{
		chunkRepo:        chunkRepo,
		embeddingsClient: embeddingsClient,
	}
}

// SearchChunksInput represents input for semantic search
type SearchChunksInput struct {
	TenantID uuid.UUID
	Query    string
	Limit    int // default: 5
}

// SearchChunksOutput represents search results
type SearchChunksOutput struct {
	Chunks []domain.ChunkSearchResult `json:"chunks"`
	Query  string                     `json:"query"`
}

// Execute performs semantic search on document chunks
func (uc *SearchChunksUseCase) Execute(ctx context.Context, input SearchChunksInput) (*SearchChunksOutput, error) {
	// Validate input
	if input.Query == "" {
		return nil, fmt.Errorf("query cannot be empty")
	}

	if input.Limit <= 0 {
		input.Limit = 5
	}

	log.Info().
		Str("tenant_id", input.TenantID.String()).
		Str("query", input.Query).
		Int("limit", input.Limit).
		Msg("Starting semantic search")

	// Generate embedding for query
	queryEmbedding, err := uc.embeddingsClient.GenerateEmbedding(ctx, input.Query)
	if err != nil {
		return nil, fmt.Errorf("failed to generate query embedding: %w", err)
	}

	log.Debug().
		Int("embedding_dim", len(queryEmbedding)).
		Msg("Query embedding generated")

	// Search for similar chunks
	results, err := uc.chunkRepo.SearchSimilar(ctx, input.TenantID, queryEmbedding, input.Limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search similar chunks: %w", err)
	}

	log.Info().
		Str("tenant_id", input.TenantID.String()).
		Int("result_count", len(results)).
		Msg("Semantic search completed")

	return &SearchChunksOutput{
		Chunks: results,
		Query:  input.Query,
	}, nil
}
