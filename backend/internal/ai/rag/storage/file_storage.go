package storage

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

// FileStorage defines interface for file storage operations
type FileStorage interface {
	Store(ctx context.Context, tenantID, documentID uuid.UUID, data []byte, fileName string) (string, error)
	Retrieve(ctx context.Context, path string) ([]byte, error)
	Delete(ctx context.Context, path string) error
}

// LocalFileStorage implements FileStorage using local filesystem
type LocalFileStorage struct {
	basePath string
}

// NewLocalFileStorage creates a new local file storage
func NewLocalFileStorage(basePath string) *LocalFileStorage {
	// Ensure base directory exists
	if err := os.MkdirAll(basePath, 0755); err != nil {
		// Log error but don't fail - directory might be created later
		fmt.Printf("Warning: failed to create storage directory %s: %v\n", basePath, err)
	}
	return &LocalFileStorage{
		basePath: basePath,
	}
}

// Store saves file to disk and returns the file path
func (s *LocalFileStorage) Store(ctx context.Context, tenantID, documentID uuid.UUID, data []byte, fileName string) (string, error) {
	// Create directory structure: basePath/tenantID/documentID/
	dirPath := filepath.Join(s.basePath, tenantID.String(), documentID.String())
	if err := os.MkdirAll(dirPath, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	// Full file path
	filePath := filepath.Join(dirPath, fileName)

	// Write file
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	return filePath, nil
}

// Retrieve reads file from disk
func (s *LocalFileStorage) Retrieve(ctx context.Context, path string) ([]byte, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}
	return data, nil
}

// Delete removes file from disk
func (s *LocalFileStorage) Delete(ctx context.Context, path string) error {
	if err := os.Remove(path); err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}
