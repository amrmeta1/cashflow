package usecase

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/ai/rag/embeddings"
	"github.com/finch-co/cashflow/internal/ai/rag/domain"
)

// EmbedChunksUseCase handles chunk embedding generation
type EmbedChunksUseCase struct {
	chunkRepo        domain.ChunkRepository
	embeddingsClient embeddings.EmbeddingsClient
}

// NewEmbedChunksUseCase creates a new chunk embedding use case
func NewEmbedChunksUseCase(
	chunkRepo domain.ChunkRepository,
	embeddingsClient embeddings.EmbeddingsClient,
) *EmbedChunksUseCase {
	return &EmbedChunksUseCase{
		chunkRepo:        chunkRepo,
		embeddingsClient: embeddingsClient,
	}
}

// EmbedChunksInput represents input for embedding generation
type EmbedChunksInput struct {
	TenantID   uuid.UUID
	DocumentID uuid.UUID
}

// Execute generates embeddings for document chunks
func (uc *EmbedChunksUseCase) Execute(ctx context.Context, input EmbedChunksInput) error {
	log.Info().
		Str("document_id", input.DocumentID.String()).
		Str("tenant_id", input.TenantID.String()).
		Msg("Starting embedding generation")

	// Fetch all chunks for the document
	chunks, err := uc.chunkRepo.ListByDocument(ctx, input.TenantID, input.DocumentID)
	if err != nil {
		return fmt.Errorf("failed to fetch chunks: %w", err)
	}

	if len(chunks) == 0 {
		log.Warn().
			Str("document_id", input.DocumentID.String()).
			Msg("No chunks found for document")
		return nil
	}

	// Generate embeddings for each chunk
	successCount := 0
	errorCount := 0

	for _, chunk := range chunks {
		// Skip if already has embedding
		if len(chunk.Embedding) > 0 {
			log.Debug().
				Str("chunk_id", chunk.ID.String()).
				Msg("Chunk already has embedding, skipping")
			successCount++
			continue
		}

		// Generate embedding
		embedding, err := uc.embeddingsClient.GenerateEmbedding(ctx, chunk.Content)
		if err != nil {
			log.Error().
				Err(err).
				Str("chunk_id", chunk.ID.String()).
				Int("chunk_index", chunk.Index).
				Msg("Failed to generate embedding for chunk")
			errorCount++
			continue
		}

		// Update chunk with embedding
		if err := uc.chunkRepo.UpdateEmbedding(ctx, input.TenantID, chunk.ID, embedding); err != nil {
			log.Error().
				Err(err).
				Str("chunk_id", chunk.ID.String()).
				Int("chunk_index", chunk.Index).
				Msg("Failed to update chunk with embedding")
			errorCount++
			continue
		}

		successCount++
		log.Debug().
			Str("chunk_id", chunk.ID.String()).
			Int("chunk_index", chunk.Index).
			Int("embedding_dim", len(embedding)).
			Msg("Successfully generated and stored embedding")
	}

	log.Info().
		Str("document_id", input.DocumentID.String()).
		Int("total_chunks", len(chunks)).
		Int("success_count", successCount).
		Int("error_count", errorCount).
		Msg("Embedding generation completed")

	// Return error if all chunks failed
	if errorCount > 0 && successCount == 0 {
		return fmt.Errorf("failed to generate embeddings for all %d chunks", errorCount)
	}

	return nil
}
