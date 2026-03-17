package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"tadfuq/rag-service/internal/models"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	pgvector "github.com/pgvector/pgvector-go"
)

// DB wraps the sql.DB connection
type DB struct {
	conn *sql.DB
}

// New creates a new DB connection and verifies it
func New(dsn string) (*DB, error) {
	conn, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("opening db: %w", err)
	}
	if err := conn.Ping(); err != nil {
		return nil, fmt.Errorf("pinging db: %w", err)
	}

	// pgvector types are automatically registered in v0.2.2+
	// No explicit registration needed

	conn.SetMaxOpenConns(25)
	conn.SetMaxIdleConns(5)

	return &DB{conn: conn}, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	return db.conn.Close()
}

// ----------------------------------------------------------------
// Documents
// ----------------------------------------------------------------

// CreateDocument inserts a new document record
func (db *DB) CreateDocument(ctx context.Context, doc *models.Document) error {
	meta, err := json.Marshal(doc.Metadata)
	if err != nil {
		return err
	}
	query := `
		INSERT INTO documents (id, name, file_type, file_size, page_count, metadata)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at, updated_at`
	return db.conn.QueryRowContext(ctx, query,
		doc.ID, doc.Name, doc.FileType, doc.FileSize, doc.PageCount, meta,
	).Scan(&doc.CreatedAt, &doc.UpdatedAt)
}

// GetDocument retrieves a document by ID
func (db *DB) GetDocument(ctx context.Context, id uuid.UUID) (*models.Document, error) {
	doc := &models.Document{}
	var meta []byte
	query := `SELECT id, name, file_type, file_size, page_count, created_at, updated_at, metadata
			  FROM documents WHERE id = $1`
	err := db.conn.QueryRowContext(ctx, query, id).Scan(
		&doc.ID, &doc.Name, &doc.FileType, &doc.FileSize, &doc.PageCount,
		&doc.CreatedAt, &doc.UpdatedAt, &meta,
	)
	if err != nil {
		return nil, err
	}
	return doc, json.Unmarshal(meta, &doc.Metadata)
}

// ListDocuments returns all documents
func (db *DB) ListDocuments(ctx context.Context) ([]models.Document, error) {
	query := `SELECT id, name, file_type, file_size, page_count, created_at, updated_at, metadata
			  FROM documents ORDER BY created_at DESC`
	rows, err := db.conn.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []models.Document
	for rows.Next() {
		var doc models.Document
		var meta []byte
		if err := rows.Scan(
			&doc.ID, &doc.Name, &doc.FileType, &doc.FileSize, &doc.PageCount,
			&doc.CreatedAt, &doc.UpdatedAt, &meta,
		); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(meta, &doc.Metadata); err != nil {
			doc.Metadata = map[string]interface{}{}
		}
		docs = append(docs, doc)
	}
	return docs, rows.Err()
}

// DeleteDocument deletes a document and all its chunks (CASCADE)
func (db *DB) DeleteDocument(ctx context.Context, id uuid.UUID) error {
	_, err := db.conn.ExecContext(ctx, `DELETE FROM documents WHERE id = $1`, id)
	return err
}

// ----------------------------------------------------------------
// Chunks
// ----------------------------------------------------------------

// CreateChunks batch-inserts chunks
func (db *DB) CreateChunks(ctx context.Context, chunks []models.Chunk) error {
	tx, err := db.conn.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO chunks (id, document_id, content, chunk_index, page_number, embedding, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, c := range chunks {
		meta, _ := json.Marshal(c.Metadata)
		if _, err := stmt.ExecContext(ctx,
			c.ID, c.DocumentID, c.Content, c.ChunkIndex, c.PageNumber, c.Embedding, meta,
		); err != nil {
			return fmt.Errorf("inserting chunk %d: %w", c.ChunkIndex, err)
		}
	}

	return tx.Commit()
}

// SimilaritySearch finds the top-k most similar chunks to a query embedding
func (db *DB) SimilaritySearch(ctx context.Context, embedding pgvector.Vector, topK int) ([]models.SimilarChunk, error) {
	query := `
		SELECT c.id, c.document_id, c.content, c.chunk_index, c.page_number,
		       c.embedding, c.metadata, c.created_at,
		       d.name as document_name,
		       1 - (c.embedding <=> $1) as similarity
		FROM chunks c
		JOIN documents d ON d.id = c.document_id
		ORDER BY c.embedding <=> $1
		LIMIT $2`

	rows, err := db.conn.QueryContext(ctx, query, embedding, topK)
	if err != nil {
		return nil, fmt.Errorf("similarity search: %w", err)
	}
	defer rows.Close()

	var results []models.SimilarChunk
	for rows.Next() {
		var sc models.SimilarChunk
		var meta []byte
		if err := rows.Scan(
			&sc.ID, &sc.DocumentID, &sc.Content, &sc.ChunkIndex, &sc.PageNumber,
			&sc.Embedding, &meta, &sc.CreatedAt,
			&sc.DocumentName, &sc.Similarity,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(meta, &sc.Metadata)
		results = append(results, sc)
	}
	return results, rows.Err()
}

// ----------------------------------------------------------------
// Chat Sessions
// ----------------------------------------------------------------

// CreateChatSession creates a new session
func (db *DB) CreateChatSession(ctx context.Context, name string) (*models.ChatSession, error) {
	sess := &models.ChatSession{ID: uuid.New(), Name: name}
	err := db.conn.QueryRowContext(ctx,
		`INSERT INTO chat_sessions (id, name) VALUES ($1, $2) RETURNING created_at`,
		sess.ID, sess.Name,
	).Scan(&sess.CreatedAt)
	return sess, err
}

// AddChatMessage adds a message to a session
func (db *DB) AddChatMessage(ctx context.Context, msg *models.ChatMessage) error {
	meta, _ := json.Marshal(msg.Metadata)
	return db.conn.QueryRowContext(ctx,
		`INSERT INTO chat_messages (id, session_id, role, content, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING created_at`,
		msg.ID, msg.SessionID, msg.Role, msg.Content, meta,
	).Scan(&msg.CreatedAt)
}

// GetChatHistory retrieves the last N messages for a session
func (db *DB) GetChatHistory(ctx context.Context, sessionID uuid.UUID, limit int) ([]models.ChatMessage, error) {
	rows, err := db.conn.QueryContext(ctx,
		`SELECT id, session_id, role, content, metadata, created_at
		 FROM chat_messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2`,
		sessionID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []models.ChatMessage
	for rows.Next() {
		var m models.ChatMessage
		var meta []byte
		if err := rows.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &meta, &m.CreatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(meta, &m.Metadata)
		msgs = append(msgs, m)
	}
	// Reverse to get chronological order
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	return msgs, rows.Err()
}
