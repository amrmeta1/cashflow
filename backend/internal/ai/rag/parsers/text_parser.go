package parser

import (
	"context"
	"fmt"
	"strings"
	"unicode/utf8"
)

// TextParser defines interface for parsing plain text documents
type TextParser interface {
	// Parse extracts text content from a text file
	Parse(ctx context.Context, data []byte) (string, error)
}

// DefaultTextParser implements TextParser
type DefaultTextParser struct{}

// NewTextParser creates a new text parser
func NewTextParser() *DefaultTextParser {
	return &DefaultTextParser{}
}

// Parse extracts text from plain text file with UTF-8 validation
func (p *DefaultTextParser) Parse(ctx context.Context, data []byte) (string, error) {
	if !utf8.Valid(data) {
		return "", fmt.Errorf("invalid UTF-8 encoding")
	}

	text := string(data)
	if strings.TrimSpace(text) == "" {
		return "", fmt.Errorf("empty text content")
	}

	return text, nil
}
