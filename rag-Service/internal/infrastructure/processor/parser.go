// Package processor implements the domain/rag.Parser port.
// It routes files to the correct extraction strategy:
//   - PDF text layer  → ledongthuc/pdf (native, no CGO)
//   - PDF image-based → Claude vision (fallback via claudeVision)
//   - DOCX            → ZIP+XML extraction (pure Go, no CGO)
//   - Images          → Claude vision
package processor

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/csv"
	"fmt"
	"io"
	"path/filepath"
	"strings"

	"tadfuq/rag-service/internal/domain/rag"

	"github.com/ledongthuc/pdf"
	"github.com/xuri/excelize/v2"
)

// claudeVision is a minimal interface so this package does not
// import the full llm package (avoids circular deps).
type claudeVision interface {
	ExtractFromFile(ctx context.Context, data []byte, mediaType, hint string) (string, error)
}

// DocumentParser implements rag.Parser.
type DocumentParser struct {
	vision claudeVision
}

// NewDocumentParser constructs the parser.
// vision must implement ExtractFromFile for image/PDF fallback.
func NewDocumentParser(vision claudeVision) *DocumentParser {
	return &DocumentParser{vision: vision}
}

const extractionHint = `You are processing a financial document for a RAG system.
Extract ALL text, tables, numbers, labels, and financial data exactly as presented.
Preserve table structure using spaces and | delimiters.
Do not summarise — output the raw content.`

// Parse dispatches to the correct extractor based on file extension.
func (p *DocumentParser) Parse(ctx context.Context, filename string, data []byte) (*rag.ParsedDocument, error) {
	ext := strings.ToLower(filepath.Ext(filename))

	switch ext {
	case ".pdf":
		return p.parsePDF(ctx, data)
	case ".docx":
		return p.parseDOCX(ctx, data)
	case ".txt":
		return p.parseTXT(ctx, data)
	case ".xlsx", ".xls":
		return p.parseExcel(ctx, data)
	case ".csv":
		return p.parseCSV(ctx, data)
	case ".jpg", ".jpeg":
		return p.parseImage(ctx, data, "image/jpeg")
	case ".png":
		return p.parseImage(ctx, data, "image/png")
	case ".webp":
		return p.parseImage(ctx, data, "image/webp")
	case ".gif":
		return p.parseImage(ctx, data, "image/gif")
	default:
		return nil, fmt.Errorf("%w: %s", rag.ErrUnsupportedFileType, ext)
	}
}

// ----------------------------------------------------------------
// PDF
// ----------------------------------------------------------------

func (p *DocumentParser) parsePDF(ctx context.Context, data []byte) (*rag.ParsedDocument, error) {
	// Attempt native text extraction first (fast, no API call)
	pages, err := extractPDFPages(data)
	totalChars := 0
	for _, pg := range pages {
		totalChars += len(strings.TrimSpace(pg))
	}

	if err == nil && totalChars > 100 {
		return &rag.ParsedDocument{
			Pages:      cleanPages(pages),
			PageCount:  len(pages),
			SourceType: "pdf",
		}, nil
	}

	// Fallback: treat as image-based PDF, send to Claude vision
	text, err := p.vision.ExtractFromFile(ctx, data, "application/pdf", extractionHint)
	if err != nil {
		return nil, fmt.Errorf("processor.parsePDF (vision fallback): %w", err)
	}
	pages = []string{text}
	return &rag.ParsedDocument{
		Pages:      pages,
		PageCount:  1,
		SourceType: "pdf",
	}, nil
}

func extractPDFPages(data []byte) ([]string, error) {
	r, err := pdf.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, err
	}
	pages := make([]string, r.NumPage())
	for i := 1; i <= r.NumPage(); i++ {
		pg := r.Page(i)
		if pg.V.IsNull() {
			continue
		}
		text, _ := pg.GetPlainText(nil)
		pages[i-1] = text
	}
	return pages, nil
}

// ----------------------------------------------------------------
// DOCX
// ----------------------------------------------------------------

func (p *DocumentParser) parseDOCX(_ context.Context, data []byte) (*rag.ParsedDocument, error) {
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("processor.parseDOCX: not a valid zip/docx: %w", err)
	}
	for _, f := range zr.File {
		if f.Name != "word/document.xml" {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return nil, err
		}
		xmlBytes, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			return nil, err
		}
		text := stripXML(string(xmlBytes))
		if strings.TrimSpace(text) == "" {
			return nil, rag.ErrEmptyDocument
		}
		return &rag.ParsedDocument{
			Pages:      []string{text},
			PageCount:  1,
			SourceType: "docx",
		}, nil
	}
	return nil, fmt.Errorf("processor.parseDOCX: word/document.xml not found in archive")
}

// stripXML removes XML tags and normalises whitespace.
func stripXML(src string) string {
	var sb strings.Builder
	inTag := false
	prevSpace := false
	for _, ch := range src {
		switch {
		case ch == '<':
			inTag = true
			if !prevSpace {
				sb.WriteRune(' ')
				prevSpace = true
			}
		case ch == '>':
			inTag = false
		case !inTag:
			if ch == '\n' {
				sb.WriteRune('\n')
				prevSpace = true
			} else if ch == ' ' || ch == '\t' || ch == '\r' {
				if !prevSpace {
					sb.WriteRune(' ')
					prevSpace = true
				}
			} else {
				sb.WriteRune(ch)
				prevSpace = false
			}
		}
	}
	return strings.TrimSpace(sb.String())
}

// ----------------------------------------------------------------
// Excel
// ----------------------------------------------------------------

func (p *DocumentParser) parseExcel(_ context.Context, data []byte) (*rag.ParsedDocument, error) {
	f, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("processor.parseExcel: failed to open: %w", err)
	}
	defer f.Close()

	var pages []string
	sheets := f.GetSheetList()

	for _, sheet := range sheets {
		rows, err := f.GetRows(sheet)
		if err != nil {
			continue
		}

		var sb strings.Builder
		sb.WriteString(fmt.Sprintf("Sheet: %s\n\n", sheet))

		for _, row := range rows {
			if len(row) == 0 {
				continue
			}
			// Join cells with | delimiter for table structure
			sb.WriteString(strings.Join(row, " | "))
			sb.WriteString("\n")
		}

		if content := strings.TrimSpace(sb.String()); content != "" {
			pages = append(pages, content)
		}
	}

	if len(pages) == 0 {
		return nil, rag.ErrEmptyDocument
	}

	return &rag.ParsedDocument{
		Pages:      pages,
		PageCount:  len(pages),
		SourceType: "excel",
		SheetNames: sheets,
	}, nil
}

// ----------------------------------------------------------------
// CSV
// ----------------------------------------------------------------

func (p *DocumentParser) parseCSV(_ context.Context, data []byte) (*rag.ParsedDocument, error) {
	r := csv.NewReader(bytes.NewReader(data))
	r.TrimLeadingSpace = true

	records, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("processor.parseCSV: failed to read: %w", err)
	}

	if len(records) == 0 {
		return nil, rag.ErrEmptyDocument
	}

	var sb strings.Builder
	for _, record := range records {
		if len(record) == 0 {
			continue
		}
		// Join cells with | delimiter for table structure
		sb.WriteString(strings.Join(record, " | "))
		sb.WriteString("\n")
	}

	content := strings.TrimSpace(sb.String())
	if content == "" {
		return nil, rag.ErrEmptyDocument
	}

	return &rag.ParsedDocument{
		Pages:      []string{content},
		PageCount:  1,
		SourceType: "csv",
	}, nil
}

// ----------------------------------------------------------------
// TXT
// ----------------------------------------------------------------

func (p *DocumentParser) parseTXT(_ context.Context, data []byte) (*rag.ParsedDocument, error) {
	content := strings.TrimSpace(string(data))
	if content == "" {
		return nil, rag.ErrEmptyDocument
	}
	return &rag.ParsedDocument{
		Pages:      []string{content},
		PageCount:  1,
		SourceType: "txt",
	}, nil
}

// ----------------------------------------------------------------
// Images
// ----------------------------------------------------------------

func (p *DocumentParser) parseImage(ctx context.Context, data []byte, mediaType string) (*rag.ParsedDocument, error) {
	text, err := p.vision.ExtractFromFile(ctx, data, mediaType, extractionHint)
	if err != nil {
		return nil, fmt.Errorf("processor.parseImage (%s): %w", mediaType, err)
	}
	return &rag.ParsedDocument{
		Pages:      []string{text},
		PageCount:  1,
		SourceType: "image",
	}, nil
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

func cleanPages(pages []string) []string {
	out := make([]string, 0, len(pages))
	for _, p := range pages {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

// Base64Encode is exported for tests / debugging.
func Base64Encode(data []byte) string {
	return base64.StdEncoding.EncodeToString(data)
}
