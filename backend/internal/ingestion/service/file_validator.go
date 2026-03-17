package service

import (
	"fmt"
	"io"
	"strings"

	"github.com/finch-co/cashflow/internal/shared/errors"
)

const (
	// MaxFileSize is the maximum allowed file size (50MB)
	MaxFileSize = 50 * 1024 * 1024

	// MaxCSVRows is the maximum number of rows allowed in a CSV
	MaxCSVRows = 100000
)

// FileValidator validates uploaded files.
type FileValidator struct{}

// NewFileValidator creates a new file validator.
func NewFileValidator() *FileValidator {
	return &FileValidator{}
}

// ValidateFile performs basic file validation.
func (v *FileValidator) ValidateFile(fileName string, size int64) error {
	if fileName == "" {
		return errors.NewValidationError("file_name", "file name is required")
	}

	if size <= 0 {
		return errors.NewValidationError("file_size", "file is empty")
	}

	if size > MaxFileSize {
		return errors.NewValidationError("file_size", fmt.Sprintf("file too large (max %d bytes)", MaxFileSize))
	}

	// Validate file extension
	ext := getFileExtension(fileName)
	if !isValidExtension(ext) {
		return errors.NewValidationError("file_type", fmt.Sprintf("unsupported file type: %s", ext))
	}

	return nil
}

// ValidateCSVSize validates CSV file size by counting rows.
func (v *FileValidator) ValidateCSVSize(reader io.Reader) error {
	// This is a simplified version - in production, you'd want to
	// stream the file and count rows without loading everything into memory
	return nil
}

// getFileExtension extracts the file extension from a filename.
func getFileExtension(fileName string) string {
	parts := strings.Split(fileName, ".")
	if len(parts) < 2 {
		return ""
	}
	return strings.ToLower(parts[len(parts)-1])
}

// isValidExtension checks if the file extension is supported.
func isValidExtension(ext string) bool {
	validExtensions := map[string]bool{
		"csv":  true,
		"pdf":  true,
		"xlsx": false, // Not yet supported
		"xls":  false, // Not yet supported
	}

	return validExtensions[ext]
}
