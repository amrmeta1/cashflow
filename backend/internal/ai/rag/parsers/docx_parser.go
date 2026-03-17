package parser

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	"github.com/nguyenthenguyen/docx"
)

// DOCXParser defines interface for parsing DOCX documents
type DOCXParser interface {
	// Parse extracts text content from a DOCX file
	Parse(ctx context.Context, data []byte) (string, error)
}

// DefaultDOCXParser implements DOCXParser
type DefaultDOCXParser struct{}

// NewDOCXParser creates a new DOCX parser
func NewDOCXParser() *DefaultDOCXParser {
	return &DefaultDOCXParser{}
}

// Parse extracts text from DOCX
func (p *DefaultDOCXParser) Parse(ctx context.Context, data []byte) (string, error) {
	reader := bytes.NewReader(data)
	replaceDoc, err := docx.ReadDocxFromMemory(reader, int64(len(data)))
	if err != nil {
		return "", fmt.Errorf("failed to read DOCX: %w", err)
	}
	defer replaceDoc.Close()

	// Get editable document and extract content
	doc := replaceDoc.Editable()
	content := doc.GetContent()

	if content == "" {
		return "", fmt.Errorf("no text content extracted from DOCX")
	}

	return strings.TrimSpace(content), nil
}
