package processor

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"path/filepath"
	"strings"

	"github.com/ledongthuc/pdf"
)

// ProcessedDocument holds the extracted text and metadata from a document
type ProcessedDocument struct {
	Text      string
	Pages     []string // per-page text
	PageCount int
}

// Processor handles different document types
type Processor struct {
	claudeExtractor ClaudeExtractor
}

// ClaudeExtractor is an interface for using Claude to extract text from binary files
type ClaudeExtractor interface {
	ExtractFromFile(ctx context.Context, data []byte, mediaType string, hint string) (string, error)
}

// New creates a new Processor
func New(extractor ClaudeExtractor) *Processor {
	return &Processor{claudeExtractor: extractor}
}

// Process routes the file to the appropriate handler based on extension
func (p *Processor) Process(ctx context.Context, filename string, data []byte) (*ProcessedDocument, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".pdf":
		return p.processPDF(ctx, data)
	case ".docx":
		return p.processDOCX(ctx, data)
	case ".jpg", ".jpeg", ".png", ".gif", ".webp":
		return p.processImage(ctx, data, mimeType(ext))
	default:
		return nil, fmt.Errorf("unsupported file type: %s", ext)
	}
}

// processPDF extracts text from a PDF. Falls back to Claude vision for image-based PDFs.
func (p *Processor) processPDF(ctx context.Context, data []byte) (*ProcessedDocument, error) {
	// Attempt native text extraction first
	text, err := extractPDFText(data)
	if err == nil && len(strings.TrimSpace(text)) > 100 {
		pages := strings.Split(text, "\f") // form-feed = page break in ledongthuc/pdf
		return &ProcessedDocument{
			Text:      text,
			Pages:     cleanPages(pages),
			PageCount: len(pages),
		}, nil
	}

	// Fall back to Claude (handles scanned/image PDFs natively)
	extracted, err := p.claudeExtractor.ExtractFromFile(ctx, data, "application/pdf",
		"This is a financial statement PDF. Extract ALL text, tables, numbers, labels, and financial data exactly as presented. Preserve table structure using spaces and line breaks.")
	if err != nil {
		return nil, fmt.Errorf("claude pdf extraction: %w", err)
	}
	pages := []string{extracted}
	return &ProcessedDocument{
		Text:      extracted,
		Pages:     pages,
		PageCount: 1,
	}, nil
}

// processDOCX extracts text from a .docx file (which is a ZIP of XML)
func (p *Processor) processDOCX(_ context.Context, data []byte) (*ProcessedDocument, error) {
	r, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("opening docx zip: %w", err)
	}

	var sb strings.Builder
	for _, f := range r.File {
		if f.Name == "word/document.xml" {
			rc, err := f.Open()
			if err != nil {
				return nil, err
			}
			xmlData, err := io.ReadAll(rc)
			rc.Close()
			if err != nil {
				return nil, err
			}
			sb.WriteString(extractXMLText(string(xmlData)))
			break
		}
	}

	text := strings.TrimSpace(sb.String())
	if text == "" {
		return nil, fmt.Errorf("no text content found in DOCX")
	}

	return &ProcessedDocument{
		Text:      text,
		Pages:     []string{text},
		PageCount: 1,
	}, nil
}

// processImage uses Claude vision to extract financial data from an image
func (p *Processor) processImage(ctx context.Context, data []byte, mediaType string) (*ProcessedDocument, error) {
	extracted, err := p.claudeExtractor.ExtractFromFile(ctx, data, mediaType,
		"This is a financial statement image. Extract ALL text, numbers, tables, and financial data exactly as presented. Preserve table structure.")
	if err != nil {
		return nil, fmt.Errorf("claude image extraction: %w", err)
	}
	return &ProcessedDocument{
		Text:      extracted,
		Pages:     []string{extracted},
		PageCount: 1,
	}, nil
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

func extractPDFText(data []byte) (string, error) {
	r, err := pdf.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", err
	}
	var sb strings.Builder
	for i := 1; i <= r.NumPage(); i++ {
		page := r.Page(i)
		if page.V.IsNull() {
			continue
		}
		text, err := page.GetPlainText(nil)
		if err == nil {
			sb.WriteString(text)
			sb.WriteString("\f") // page separator
		}
	}
	return sb.String(), nil
}

// extractXMLText strips XML tags and returns plain text
func extractXMLText(xmlContent string) string {
	var sb strings.Builder
	inTag := false
	prevWasSpace := false
	for _, ch := range xmlContent {
		switch {
		case ch == '<':
			inTag = true
			if !prevWasSpace {
				sb.WriteRune(' ')
				prevWasSpace = true
			}
		case ch == '>':
			inTag = false
		case !inTag:
			if ch == '\n' || ch == '\r' || ch == '\t' || ch == ' ' {
				if !prevWasSpace {
					sb.WriteRune(' ')
					prevWasSpace = true
				}
			} else {
				sb.WriteRune(ch)
				prevWasSpace = false
			}
		}
	}
	// Clean up extra whitespace
	result := strings.TrimSpace(sb.String())
	// Restore paragraph breaks (w:p tags become spaces; try to make them newlines)
	return result
}

func cleanPages(pages []string) []string {
	var out []string
	for _, p := range pages {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func mimeType(ext string) string {
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	default:
		return "image/jpeg"
	}
}

// Base64Encode encodes bytes to base64 string
func Base64Encode(data []byte) string {
	return base64.StdEncoding.EncodeToString(data)
}
