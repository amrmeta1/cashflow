package db

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/finch-co/cashflow/internal/ai/rag/domain"
)

type ChunkRepo struct {
	pool *pgxpool.Pool
}

func NewChunkRepo(pool *pgxpool.Pool) *ChunkRepo {
	return &ChunkRepo{pool: pool}
}

func (r *ChunkRepo) Create(ctx context.Context, input domain.CreateChunkInput) (*domain.DocumentChunk, error) {
	metadata, err := json.Marshal(input.Metadata)
	if err != nil {
		metadata = []byte("{}")
	}

	var chunk domain.DocumentChunk
	var metaBytes []byte

	// Dual write: write to both legacy embedding (TEXT) and new embedding_vector (pgvector)
	// Use EmbeddingVector if provided, otherwise fall back to Embedding
	embeddingToUse := input.EmbeddingVector
	if len(embeddingToUse) == 0 {
		embeddingToUse = input.Embedding
	}

	err = r.pool.QueryRow(ctx,
		`INSERT INTO document_chunks (tenant_id, document_id, chunk_index, content, embedding, embedding_vector, metadata)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, tenant_id, document_id, chunk_index, content, metadata, created_at`,
		input.TenantID, input.DocumentID, input.Index, input.Content, input.Embedding, embeddingToUse, metadata,
	).Scan(&chunk.ID, &chunk.TenantID, &chunk.DocumentID, &chunk.Index, &chunk.Content, &metaBytes, &chunk.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("creating chunk: %w", err)
	}
	_ = json.Unmarshal(metaBytes, &chunk.Metadata)
	chunk.Embedding = input.Embedding
	chunk.EmbeddingVector = input.EmbeddingVector
	return &chunk, nil
}

func (r *ChunkRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.DocumentChunk, error) {
	var chunk domain.DocumentChunk
	var metaBytes []byte
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, document_id, chunk_index, content, metadata, created_at
		 FROM document_chunks WHERE id = $1 AND tenant_id = $2`,
		id, tenantID,
	).Scan(&chunk.ID, &chunk.TenantID, &chunk.DocumentID, &chunk.Index, &chunk.Content, &metaBytes, &chunk.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("chunk not found")
	}
	if err != nil {
		return nil, fmt.Errorf("getting chunk: %w", err)
	}
	_ = json.Unmarshal(metaBytes, &chunk.Metadata)
	return &chunk, nil
}

func (r *ChunkRepo) ListByDocument(ctx context.Context, tenantID, documentID uuid.UUID) ([]domain.DocumentChunk, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, tenant_id, document_id, chunk_index, content, metadata, created_at
		 FROM document_chunks WHERE tenant_id = $1 AND document_id = $2
		 ORDER BY chunk_index ASC`,
		tenantID, documentID,
	)
	if err != nil {
		return nil, fmt.Errorf("listing chunks: %w", err)
	}
	defer rows.Close()

	var chunks []domain.DocumentChunk
	for rows.Next() {
		var chunk domain.DocumentChunk
		var metaBytes []byte
		if err := rows.Scan(&chunk.ID, &chunk.TenantID, &chunk.DocumentID, &chunk.Index, &chunk.Content, &metaBytes, &chunk.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning chunk: %w", err)
		}
		_ = json.Unmarshal(metaBytes, &chunk.Metadata)
		chunks = append(chunks, chunk)
	}
	return chunks, nil
}

func (r *ChunkRepo) SearchSimilar(ctx context.Context, tenantID uuid.UUID, embedding []float32, limit int) ([]domain.ChunkSearchResult, error) {
	if limit <= 0 {
		limit = 5
	}

	// Use pgvector column if available, otherwise fall back to legacy embedding
	query := `
		SELECT 
			id, 
			tenant_id, 
			document_id, 
			chunk_index, 
			content, 
			metadata,
			created_at,
			COALESCE(
				embedding_vector <=> $1::vector,
				embedding <-> $1
			) AS distance
		FROM document_chunks
		WHERE tenant_id = $2 AND (embedding_vector IS NOT NULL OR embedding IS NOT NULL)
		ORDER BY distance
		LIMIT $3
	`

	rows, err := r.pool.Query(ctx, query, embedding, tenantID, limit)
	if err != nil {
		return nil, fmt.Errorf("searching similar chunks: %w", err)
	}
	defer rows.Close()

	var results []domain.ChunkSearchResult
	for rows.Next() {
		var chunk domain.DocumentChunk
		var metaBytes []byte
		var distance float64

		if err := rows.Scan(
			&chunk.ID,
			&chunk.TenantID,
			&chunk.DocumentID,
			&chunk.Index,
			&chunk.Content,
			&metaBytes,
			&chunk.CreatedAt,
			&distance,
		); err != nil {
			return nil, fmt.Errorf("scanning chunk result: %w", err)
		}

		_ = json.Unmarshal(metaBytes, &chunk.Metadata)

		results = append(results, domain.ChunkSearchResult{
			Chunk:      chunk,
			Similarity: distance,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating chunk results: %w", err)
	}

	return results, nil
}

func (r *ChunkRepo) UpdateEmbedding(ctx context.Context, tenantID, chunkID uuid.UUID, embedding []float32) error {
	// Dual write: update both legacy embedding and new embedding_vector
	tag, err := r.pool.Exec(ctx,
		`UPDATE document_chunks SET embedding = $1, embedding_vector = $1 WHERE id = $2 AND tenant_id = $3`,
		embedding, chunkID, tenantID,
	)
	if err != nil {
		return fmt.Errorf("updating chunk embedding: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("chunk not found")
	}
	return nil
}

func (r *ChunkRepo) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM document_chunks WHERE id=$1 AND tenant_id=$2`,
		id, tenantID,
	)
	if err != nil {
		return fmt.Errorf("deleting chunk: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("chunk not found")
	}
	return nil
}
