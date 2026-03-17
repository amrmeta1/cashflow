package parser

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	"github.com/ledongthuc/pdf"
)

// PDFParser defines interface for parsing PDF documents
type PDFParser interface {
	// Parse extracts text content from a PDF file
	Parse(ctx context.Context, data []byte) (string, error)
}

// DefaultPDFParser implements PDFParser
type DefaultPDFParser struct{}

// NewPDFParser creates a new PDF parser
func NewPDFParser() *DefaultPDFParser {
	return &DefaultPDFParser{}
}

// Parse extracts text from PDF
func (p *DefaultPDFParser) Parse(ctx context.Context, data []byte) (string, error) {
	reader := bytes.NewReader(data)
	pdfReader, err := pdf.NewReader(reader, int64(len(data)))
	if err != nil {
		return "", fmt.Errorf("failed to create PDF reader: %w", err)
	}

	var textBuilder strings.Builder
	numPages := pdfReader.NumPage()

	for pageNum := 1; pageNum <= numPages; pageNum++ {
		page := pdfReader.Page(pageNum)
		if page.V.IsNull() {
			continue
		}

		text, err := page.GetPlainText(nil)
		if err != nil {
			// Log error but continue with other pages
			continue
		}

		textBuilder.WriteString(text)
		textBuilder.WriteString("\n\n")
	}

	result := textBuilder.String()
	if result == "" {
		return "", fmt.Errorf("no text content extracted from PDF")
	}

	return strings.TrimSpace(result), nil
}
