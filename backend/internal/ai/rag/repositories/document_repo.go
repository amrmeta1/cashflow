package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"

	"github.com/finch-co/cashflow/internal/ai/rag/domain"
)

type DocumentRepo struct {
	pool *pgxpool.Pool
}

func NewDocumentRepo(pool *pgxpool.Pool) *DocumentRepo {
	return &DocumentRepo{pool: pool}
}

func (r *DocumentRepo) Create(ctx context.Context, input domain.CreateDocumentInput) (*domain.Document, error) {
	log.Debug().
		Str("tenant_id", input.TenantID.String()).
		Str("title", input.Title).
		Str("type", string(input.Type)).
		Str("operation", "create_document").
		Msg("Starting document creation in database")

	var doc domain.Document
	query := `INSERT INTO documents (tenant_id, title, type, file_name, mime_type, source, uploaded_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, tenant_id, title, type, file_name, mime_type, source, uploaded_by, status, created_at`

	err := r.pool.QueryRow(ctx, query,
		input.TenantID, input.Title, input.Type, input.FileName, input.MimeType, input.Source, input.UploadedBy,
	).Scan(&doc.ID, &doc.TenantID, &doc.Title, &doc.Type, &doc.FileName, &doc.MimeType, &doc.Source, &doc.UploadedBy, &doc.Status, &doc.CreatedAt)

	if err != nil {
		log.Error().
			Err(err).
			Str("tenant_id", input.TenantID.String()).
			Str("query", query).
			Msg("Failed to create document in database")
		return nil, fmt.Errorf("creating document: %w", err)
	}

	log.Info().
		Str("tenant_id", input.TenantID.String()).
		Str("document_id", doc.ID.String()).
		Str("title", doc.Title).
		Msg("Document created successfully in database")

	return &doc, nil
}

func (r *DocumentRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Document, error) {
	var doc domain.Document
	err := r.pool.QueryRow(ctx,
		`SELECT id, tenant_id, title, type, file_name, mime_type, source, uploaded_by, status, created_at
		 FROM documents WHERE id = $1 AND tenant_id = $2`,
		id, tenantID,
	).Scan(&doc.ID, &doc.TenantID, &doc.Title, &doc.Type, &doc.FileName, &doc.MimeType, &doc.Source, &doc.UploadedBy, &doc.Status, &doc.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("document not found")
	}
	if err != nil {
		return nil, fmt.Errorf("getting document: %w", err)
	}
	return &doc, nil
}

func (r *DocumentRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID, limit, offset int) ([]domain.Document, int, error) {
	var total int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM documents WHERE tenant_id = $1`,
		tenantID,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("counting documents: %w", err)
	}

	rows, err := r.pool.Query(ctx,
		`SELECT id, tenant_id, title, type, file_name, mime_type, source, uploaded_by, status, created_at
		 FROM documents WHERE tenant_id = $1
		 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		tenantID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("listing documents: %w", err)
	}
	defer rows.Close()

	var docs []domain.Document
	for rows.Next() {
		var doc domain.Document
		if err := rows.Scan(&doc.ID, &doc.TenantID, &doc.Title, &doc.Type, &doc.FileName, &doc.MimeType, &doc.Source, &doc.UploadedBy, &doc.Status, &doc.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scanning document: %w", err)
		}
		docs = append(docs, doc)
	}
	return docs, total, nil
}

func (r *DocumentRepo) Update(ctx context.Context, tenantID, id uuid.UUID, input domain.UpdateDocumentInput) (*domain.Document, error) {
	existing, err := r.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	title := existing.Title
	if input.Title != nil {
		title = *input.Title
	}
	status := existing.Status
	if input.Status != nil {
		status = *input.Status
	}

	var doc domain.Document
	err = r.pool.QueryRow(ctx,
		`UPDATE documents SET title=$1, status=$2
		 WHERE id=$3 AND tenant_id=$4
		 RETURNING id, tenant_id, title, type, file_name, mime_type, source, uploaded_by, status, created_at`,
		title, status, id, tenantID,
	).Scan(&doc.ID, &doc.TenantID, &doc.Title, &doc.Type, &doc.FileName, &doc.MimeType, &doc.Source, &doc.UploadedBy, &doc.Status, &doc.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("updating document: %w", err)
	}
	return &doc, nil
}

func (r *DocumentRepo) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM documents WHERE id=$1 AND tenant_id=$2`,
		id, tenantID,
	)
	if err != nil {
		return fmt.Errorf("deleting document: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("document not found")
	}
	return nil
}
