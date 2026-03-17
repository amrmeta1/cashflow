// Package db implements the domain repository ports against PostgreSQL + pgvector.
// EVERY query in this file includes a tenant_id predicate — no cross-tenant
// data leakage is possible at the SQL level.
package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"tadfuq/rag-service/internal/domain/rag"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	pgvector "github.com/pgvector/pgvector-go"
)

// ----------------------------------------------------------------
// Connection
// ----------------------------------------------------------------

// RAGStore holds the *sql.DB and implements all three domain
// repository interfaces: DocumentRepository, ChunkRepository,
// SessionRepository.
type RAGStore struct {
	db *sql.DB
}

// NewRAGStore opens a Postgres connection and registers pgvector types.
func NewRAGStore(dsn string) (*RAGStore, error) {
	conn, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("db.NewRAGStore: open: %w", err)
	}
	if err := conn.Ping(); err != nil {
		return nil, fmt.Errorf("db.NewRAGStore: ping: %w", err)
	}
	// pgvector types are automatically registered in v0.2.2+
	conn.SetMaxOpenConns(25)
	conn.SetMaxIdleConns(5)
	conn.SetConnMaxLifetime(5 * time.Minute)
	return &RAGStore{db: conn}, nil
}

// Close tears down the connection pool.
func (s *RAGStore) Close() error { return s.db.Close() }

// ----------------------------------------------------------------
// DocumentRepository implementation
// ----------------------------------------------------------------

// TenantExists checks the rag_tenants table.
// ⚠ All downstream methods call this first.
func (s *RAGStore) TenantExists(ctx context.Context, tenantID uuid.UUID) (bool, error) {
	var exists bool
	err := s.db.QueryRowContext(ctx,
		`SELECT EXISTS (SELECT 1 FROM rag_tenants WHERE id = $1 AND is_active = TRUE)`,
		tenantID,
	).Scan(&exists)
	return exists, err
}

// Save upserts a Document record.
// Uses INSERT … ON CONFLICT (id) DO UPDATE so both create and
// update (e.g. page_count, status after ingestion) work.
func (s *RAGStore) Save(ctx context.Context, doc *rag.Document) error {
	meta, err := json.Marshal(doc.Metadata)
	if err != nil {
		return err
	}
	const q = `
		INSERT INTO rag_documents
		    (id, tenant_id, name, file_type, category, file_size, page_count, status, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (id) DO UPDATE SET
		    name       = EXCLUDED.name,
		    page_count = EXCLUDED.page_count,
		    status     = EXCLUDED.status,
		    metadata   = EXCLUDED.metadata,
		    updated_at = NOW()
		RETURNING created_at, updated_at`
	return s.db.QueryRowContext(ctx, q,
		doc.ID, doc.TenantID, doc.Name, doc.FileType, doc.Category,
		doc.FileSize, doc.PageCount, doc.Status, meta,
	).Scan(&doc.CreatedAt, &doc.UpdatedAt)
}

// UpdateStatus changes only the status column — avoids overwriting
// other fields during async ingestion.
func (s *RAGStore) UpdateStatus(ctx context.Context, tenantID, docID uuid.UUID, status rag.DocumentStatus) error {
	_, err := s.db.ExecContext(ctx,
		// tenant_id guard: a rogue update to another tenant's doc is silently a no-op
		`UPDATE rag_documents SET status = $1, updated_at = NOW()
		 WHERE id = $2 AND tenant_id = $3`,
		status, docID, tenantID,
	)
	return err
}

// FindByID loads one Document, scoped to tenantID.
func (s *RAGStore) FindByID(ctx context.Context, tenantID, docID uuid.UUID) (*rag.Document, error) {
	const q = `
		SELECT id, tenant_id, name, file_type, category, file_size, page_count,
		       status, metadata, created_at, updated_at
		FROM rag_documents
		WHERE id = $1 AND tenant_id = $2`   /* tenant isolation enforced here */

	doc := &rag.Document{}
	var meta []byte
	err := s.db.QueryRowContext(ctx, q, docID, tenantID).Scan(
		&doc.ID, &doc.TenantID, &doc.Name, &doc.FileType, &doc.Category,
		&doc.FileSize, &doc.PageCount, &doc.Status, &meta,
		&doc.CreatedAt, &doc.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, rag.ErrDocumentNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(meta, &doc.Metadata); err != nil {
		doc.Metadata = map[string]any{}
	}
	return doc, nil
}

// ListByTenant returns all documents for a single tenant.
func (s *RAGStore) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]rag.Document, error) {
	const q = `
		SELECT id, tenant_id, name, file_type, category, file_size, page_count,
		       status, metadata, created_at, updated_at
		FROM rag_documents
		WHERE tenant_id = $1          /* tenant isolation enforced here */
		ORDER BY created_at DESC`

	rows, err := s.db.QueryContext(ctx, q, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []rag.Document
	for rows.Next() {
		var doc rag.Document
		var meta []byte
		if err := rows.Scan(
			&doc.ID, &doc.TenantID, &doc.Name, &doc.FileType, &doc.Category,
			&doc.FileSize, &doc.PageCount, &doc.Status, &meta,
			&doc.CreatedAt, &doc.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(meta, &doc.Metadata); err != nil {
			doc.Metadata = map[string]any{}
		}
		docs = append(docs, doc)
	}
	return docs, rows.Err()
}

// Delete removes a document and cascades to its chunks via FK.
// tenant_id guard prevents cross-tenant deletes.
func (s *RAGStore) Delete(ctx context.Context, tenantID, docID uuid.UUID) error {
	res, err := s.db.ExecContext(ctx,
		`DELETE FROM rag_documents WHERE id = $1 AND tenant_id = $2`, /* tenant guard */
		docID, tenantID,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return rag.ErrDocumentNotFound
	}
	return nil
}

// ----------------------------------------------------------------
// ChunkRepository implementation
// ----------------------------------------------------------------

// SaveBatch inserts many chunks in a single transaction.
// Each chunk carries its own tenant_id (denormalised) so
// every future vector search can filter without a JOIN.
func (s *RAGStore) SaveBatch(ctx context.Context, chunks []rag.Chunk) error {
	if len(chunks) == 0 {
		return nil
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO rag_chunks
		    (id, tenant_id, document_id, content, chunk_index, page_number, embedding, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`)
	if err != nil {
		return fmt.Errorf("db.SaveBatch: prepare: %w", err)
	}
	defer stmt.Close()

	for _, c := range chunks {
		meta, _ := json.Marshal(c.Metadata)
		emb := pgvector.NewVector(c.Embedding)
		if _, err := stmt.ExecContext(ctx,
			c.ID, c.TenantID, c.DocumentID,
			c.Content, c.ChunkIndex, c.PageNumber, emb, meta,
		); err != nil {
			return fmt.Errorf("db.SaveBatch: insert chunk %d: %w", c.ChunkIndex, err)
		}
	}
	return tx.Commit()
}

// SearchSimilar finds the top-k nearest chunks for a given tenant.
//
// The WHERE tenant_id = $2 clause is the primary tenant isolation
// gate. pgvector applies cosine distance (<=>), then Postgres filters
// by tenant. For write-heavy multi-tenant deployments, consider
// IVFFlat with per-tenant probes or schema-per-tenant partitioning.
func (s *RAGStore) SearchSimilar(
	ctx       context.Context,
	tenantID  uuid.UUID,
	embedding []float32,
	topK      int,
) ([]rag.ScoredChunk, error) {
	const q = `
		SELECT
		    c.id, c.tenant_id, c.document_id, c.content,
		    c.chunk_index, c.page_number, c.embedding, c.metadata, c.created_at,
		    d.name                         AS document_name,
		    1 - (c.embedding <=> $1)       AS similarity
		FROM  rag_chunks    c
		JOIN  rag_documents d ON d.id = c.document_id
		WHERE c.tenant_id = $2             /* ← tenant isolation */
		ORDER BY c.embedding <=> $1
		LIMIT $3`

	rows, err := s.db.QueryContext(ctx, q, pgvector.NewVector(embedding), tenantID, topK)
	if err != nil {
		return nil, fmt.Errorf("db.SearchSimilar: %w", err)
	}
	defer rows.Close()

	var results []rag.ScoredChunk
	for rows.Next() {
		var sc rag.ScoredChunk
		var emb pgvector.Vector
		var meta []byte
		if err := rows.Scan(
			&sc.ID, &sc.TenantID, &sc.DocumentID, &sc.Content,
			&sc.ChunkIndex, &sc.PageNumber, &emb, &meta, &sc.CreatedAt,
			&sc.DocumentName, &sc.Similarity,
		); err != nil {
			return nil, err
		}
		sc.Embedding = emb.Slice()
		_ = json.Unmarshal(meta, &sc.Metadata)
		results = append(results, sc)
	}
	return results, rows.Err()
}

// ----------------------------------------------------------------
// SessionRepository implementation
// ----------------------------------------------------------------

// CreateSession opens a new conversation session for the tenant.
func (s *RAGStore) CreateSession(ctx context.Context, tenantID uuid.UUID, label string) (uuid.UUID, error) {
	id := uuid.New()
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO rag_query_sessions (id, tenant_id, label) VALUES ($1, $2, $3)`,
		id, tenantID, label,
	)
	return id, err
}

// SaveMessage appends one message to an existing session.
func (s *RAGStore) SaveMessage(ctx context.Context, sessionID, tenantID uuid.UUID, role, content string) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO rag_query_messages (id, session_id, tenant_id, role, content)
		 VALUES ($1, $2, $3, $4, $5)`,
		uuid.New(), sessionID, tenantID, role, content,
	)
	return err
}

// GetHistory returns the last `limit` messages in chronological order,
// scoped to both tenantID and sessionID.
func (s *RAGStore) GetHistory(ctx context.Context, tenantID, sessionID uuid.UUID, limit int) ([]rag.LLMMessage, error) {
	const q = `
		SELECT role, content
		FROM   rag_query_messages
		WHERE  session_id = $1 AND tenant_id = $2  /* tenant guard on history too */
		ORDER  BY created_at DESC
		LIMIT  $3`

	rows, err := s.db.QueryContext(ctx, q, sessionID, tenantID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []rag.LLMMessage
	for rows.Next() {
		var m rag.LLMMessage
		if err := rows.Scan(&m.Role, &m.Content); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	// reverse to get chronological order
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, rows.Err()
}

// ----------------------------------------------------------------
// CreateTenant — convenience helper (not in domain port, used by
// admin bootstrap or tests)
// ----------------------------------------------------------------

// CreateTenant inserts a new tenant row and returns its ID.
func (s *RAGStore) CreateTenant(ctx context.Context, name string) (uuid.UUID, error) {
	id := uuid.New()
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO rag_tenants (id, name) VALUES ($1, $2)
		 ON CONFLICT (name) DO NOTHING`,
		id, strings.TrimSpace(name),
	)
	if err != nil {
		return uuid.Nil, err
	}
	// If the name already existed, return its existing ID
	err = s.db.QueryRowContext(ctx,
		`SELECT id FROM rag_tenants WHERE name = $1`, name,
	).Scan(&id)
	return id, err
}
