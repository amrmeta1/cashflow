package service

import (
	"strings"
	"unicode"

	"github.com/google/uuid"
)

// ----------------------------------------------------------------
// Configuration
// ----------------------------------------------------------------

type ChunkerConfig struct {
	TextTargetTokens  int
	TextOverlapTokens int
	TableRowsPerChunk int
}

func DefaultChunkerConfig() ChunkerConfig {
	return ChunkerConfig{
		TextTargetTokens:  700,
		TextOverlapTokens: 50,
		TableRowsPerChunk: 20,
	}
}

// ----------------------------------------------------------------
// Section Types
// ----------------------------------------------------------------

type SectionType string

const (
	SectionTypeText  SectionType = "text"
	SectionTypeTable SectionType = "table"
)

type Section struct {
	Type     SectionType
	Content  string
	StartRow int
	EndRow   int
	Metadata map[string]any
}

// ----------------------------------------------------------------
// Chunk Result
// ----------------------------------------------------------------

type ChunkResult struct {
	Content     string
	SectionType SectionType
	Metadata    ChunkMetadata
}

type ChunkMetadata struct {
	DocumentID    uuid.UUID
	SectionType   string
	RowStart      *int
	RowEnd        *int
	SheetName     *string
	ColumnHeaders []string
	TableName     *string
	SourcePage    int
	TokenCount    int
	CharStart     int
	CharEnd       int
}

// ----------------------------------------------------------------
// Chunker
// ----------------------------------------------------------------

type Chunker struct {
	config ChunkerConfig
}

func NewChunker(config ChunkerConfig) *Chunker {
	return &Chunker{config: config}
}

// ChunkDocument processes a document and returns chunks with metadata
func (c *Chunker) ChunkDocument(pages []string, documentID uuid.UUID, sourceType string, sheetNames []string) []ChunkResult {
	var allChunks []ChunkResult

	for pageIdx, pageContent := range pages {
		pageNumber := pageIdx + 1

		// Determine sheet name if available
		var sheetName *string
		if pageIdx < len(sheetNames) && sheetNames[pageIdx] != "" {
			sheetName = &sheetNames[pageIdx]
		}

		// Detect sections in this page
		sections := c.detectSections(pageContent, sourceType, sheetName)

		// Chunk each section appropriately
		for _, section := range sections {
			section.Metadata["source_page"] = pageNumber
			section.Metadata["document_id"] = documentID

			var sectionChunks []ChunkResult
			if section.Type == SectionTypeTable {
				sectionChunks = c.chunkTableSection(section, documentID, pageNumber)
			} else {
				sectionChunks = c.chunkTextSection(section, documentID, pageNumber)
			}

			allChunks = append(allChunks, sectionChunks...)
		}
	}

	return allChunks
}

// ----------------------------------------------------------------
// Section Detection
// ----------------------------------------------------------------

func (c *Chunker) detectSections(content string, sourceType string, sheetName *string) []Section {
	// For Excel/CSV, entire content is a table
	if sourceType == "excel" || sourceType == "csv" {
		lines := strings.Split(content, "\n")
		metadata := make(map[string]any)
		if sheetName != nil {
			metadata["sheet_name"] = *sheetName
		}

		return []Section{{
			Type:     SectionTypeTable,
			Content:  content,
			StartRow: 0,
			EndRow:   len(lines) - 1,
			Metadata: metadata,
		}}
	}

	// For PDF/DOCX, detect tables by analyzing patterns
	return c.detectMixedSections(content)
}

func (c *Chunker) detectMixedSections(content string) []Section {
	lines := strings.Split(content, "\n")
	var sections []Section
	var currentSection *Section

	for i, line := range lines {
		isTableLine := c.isTableLine(line)

		if currentSection == nil {
			// Start new section
			sectionType := SectionTypeText
			if isTableLine {
				sectionType = SectionTypeTable
			}
			currentSection = &Section{
				Type:     sectionType,
				Content:  line + "\n",
				StartRow: i,
				Metadata: make(map[string]any),
			}
		} else if (currentSection.Type == SectionTypeTable && !isTableLine) ||
			(currentSection.Type == SectionTypeText && isTableLine) {
			// Section type changed, save current and start new
			currentSection.EndRow = i - 1
			sections = append(sections, *currentSection)

			sectionType := SectionTypeText
			if isTableLine {
				sectionType = SectionTypeTable
			}
			currentSection = &Section{
				Type:     sectionType,
				Content:  line + "\n",
				StartRow: i,
				Metadata: make(map[string]any),
			}
		} else {
			// Continue current section
			currentSection.Content += line + "\n"
		}
	}

	// Don't forget last section
	if currentSection != nil {
		currentSection.EndRow = len(lines) - 1
		sections = append(sections, *currentSection)
	}

	return sections
}

func (c *Chunker) isTableLine(line string) bool {
	// Count pipe delimiters
	pipeCount := strings.Count(line, "|")
	if pipeCount >= 3 {
		return true
	}

	// Check for tab-separated values (common in tables)
	tabCount := strings.Count(line, "\t")
	if tabCount >= 2 {
		return true
	}

	// Check for aligned columns (multiple consecutive spaces)
	if strings.Contains(line, "  ") {
		parts := strings.Fields(line)
		// If line has multiple numeric values, likely a table
		numericCount := 0
		for _, part := range parts {
			if isNumeric(part) {
				numericCount++
			}
		}
		if numericCount >= 2 {
			return true
		}
	}

	return false
}

func isNumeric(s string) bool {
	s = strings.TrimSpace(s)
	if s == "" {
		return false
	}

	// Remove common numeric formatting
	s = strings.ReplaceAll(s, ",", "")
	s = strings.ReplaceAll(s, "$", "")
	s = strings.ReplaceAll(s, "%", "")

	for _, r := range s {
		if !unicode.IsDigit(r) && r != '.' && r != '-' {
			return false
		}
	}
	return true
}

// ----------------------------------------------------------------
// Text Chunking
// ----------------------------------------------------------------

func (c *Chunker) chunkTextSection(section Section, documentID uuid.UUID, pageNumber int) []ChunkResult {
	var chunks []ChunkResult

	sentences := splitSentences(section.Content)
	var currentContent strings.Builder
	var currentTokens int
	charStart := 0

	for i, sentence := range sentences {
		sentenceTokens := estimateTokens(sentence)

		// If adding this sentence exceeds target, save current chunk
		if currentTokens > 0 && currentTokens+sentenceTokens > c.config.TextTargetTokens {
			content := strings.TrimSpace(currentContent.String())
			if content != "" {
				chunks = append(chunks, ChunkResult{
					Content:     content,
					SectionType: SectionTypeText,
					Metadata: ChunkMetadata{
						DocumentID:  documentID,
						SectionType: string(SectionTypeText),
						SourcePage:  pageNumber,
						TokenCount:  currentTokens,
						CharStart:   charStart,
						CharEnd:     charStart + len(content),
					},
				})
			}

			// Start new chunk with overlap
			overlapSentences := getOverlapSentences(sentences[:i], c.config.TextOverlapTokens)
			currentContent.Reset()
			currentTokens = 0
			charStart += len(content)

			for _, s := range overlapSentences {
				currentContent.WriteString(s)
				currentContent.WriteString(" ")
				currentTokens += estimateTokens(s)
			}
		}

		currentContent.WriteString(sentence)
		currentContent.WriteString(" ")
		currentTokens += sentenceTokens
	}

	// Don't forget last chunk
	if remaining := strings.TrimSpace(currentContent.String()); remaining != "" {
		chunks = append(chunks, ChunkResult{
			Content:     remaining,
			SectionType: SectionTypeText,
			Metadata: ChunkMetadata{
				DocumentID:  documentID,
				SectionType: string(SectionTypeText),
				SourcePage:  pageNumber,
				TokenCount:  currentTokens,
				CharStart:   charStart,
				CharEnd:     charStart + len(remaining),
			},
		})
	}

	return chunks
}

func estimateTokens(text string) int {
	words := len(strings.Fields(text))
	return int(float64(words) / 0.75)
}

func splitSentences(text string) []string {
	var sentences []string
	var current strings.Builder

	runes := []rune(text)
	for i, r := range runes {
		current.WriteRune(r)

		// Newline as sentence boundary for long content
		if r == '\n' && current.Len() > 50 {
			sentences = append(sentences, current.String())
			current.Reset()
			continue
		}

		// Sentence boundary detection
		if (r == '.' || r == '!' || r == '?') && i+1 < len(runes) {
			next := runes[i+1]
			if unicode.IsSpace(next) && current.Len() > 30 {
				sentences = append(sentences, current.String())
				current.Reset()
			}
		}
	}

	if remaining := strings.TrimSpace(current.String()); remaining != "" {
		sentences = append(sentences, remaining)
	}

	return sentences
}

func getOverlapSentences(sentences []string, targetTokens int) []string {
	totalTokens := 0
	var overlap []string

	for i := len(sentences) - 1; i >= 0; i-- {
		sentTokens := estimateTokens(sentences[i])
		if totalTokens+sentTokens > targetTokens {
			break
		}
		overlap = append([]string{sentences[i]}, overlap...)
		totalTokens += sentTokens
	}

	return overlap
}

// ----------------------------------------------------------------
// Table Chunking
// ----------------------------------------------------------------

func (c *Chunker) chunkTableSection(section Section, documentID uuid.UUID, pageNumber int) []ChunkResult {
	var chunks []ChunkResult

	lines := strings.Split(strings.TrimSpace(section.Content), "\n")
	if len(lines) == 0 {
		return chunks
	}

	// Extract headers (first non-empty line)
	var headers []string
	var dataStartIdx int
	for i, line := range lines {
		if strings.TrimSpace(line) != "" {
			headers = parseTableRow(line)
			dataStartIdx = i + 1
			break
		}
	}

	// Extract table name from sheet name if available
	var tableName *string
	if sheetNameVal, ok := section.Metadata["sheet_name"].(string); ok {
		tableName = &sheetNameVal
	}

	// Group rows into chunks
	rowsPerChunk := c.config.TableRowsPerChunk
	for i := dataStartIdx; i < len(lines); i += rowsPerChunk {
		end := i + rowsPerChunk
		if end > len(lines) {
			end = len(lines)
		}

		// Build chunk content with headers
		var chunkContent strings.Builder
		if len(headers) > 0 {
			chunkContent.WriteString(strings.Join(headers, " | "))
			chunkContent.WriteString("\n")
		}

		for j := i; j < end; j++ {
			if strings.TrimSpace(lines[j]) != "" {
				chunkContent.WriteString(lines[j])
				chunkContent.WriteString("\n")
			}
		}

		content := strings.TrimSpace(chunkContent.String())
		if content == "" {
			continue
		}

		rowStart := i
		rowEnd := end - 1

		chunks = append(chunks, ChunkResult{
			Content:     content,
			SectionType: SectionTypeTable,
			Metadata: ChunkMetadata{
				DocumentID:    documentID,
				SectionType:   string(SectionTypeTable),
				RowStart:      &rowStart,
				RowEnd:        &rowEnd,
				ColumnHeaders: headers,
				TableName:     tableName,
				SourcePage:    pageNumber,
				TokenCount:    estimateTokens(content),
			},
		})
	}

	return chunks
}

func parseTableRow(line string) []string {
	// Split by pipe delimiter if present
	if strings.Contains(line, "|") {
		parts := strings.Split(line, "|")
		var cleaned []string
		for _, part := range parts {
			if trimmed := strings.TrimSpace(part); trimmed != "" {
				cleaned = append(cleaned, trimmed)
			}
		}
		return cleaned
	}

	// Split by tabs
	if strings.Contains(line, "\t") {
		parts := strings.Split(line, "\t")
		var cleaned []string
		for _, part := range parts {
			if trimmed := strings.TrimSpace(part); trimmed != "" {
				cleaned = append(cleaned, trimmed)
			}
		}
		return cleaned
	}

	// Split by multiple spaces
	return strings.Fields(line)
}
