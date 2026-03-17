package rag

import (
	"strings"
	"unicode"
)

// ChunkerConfig configures the chunking behavior
type ChunkerConfig struct {
	ChunkSize    int // target chunk size in characters
	ChunkOverlap int // overlap between consecutive chunks
}

// DefaultConfig returns sensible defaults for financial documents
func DefaultConfig() ChunkerConfig {
	return ChunkerConfig{
		ChunkSize:    800,
		ChunkOverlap: 100,
	}
}

// Chunk represents a text chunk with its position
type Chunk struct {
	Content    string
	Index      int
	PageNumber int
}

// Chunker splits documents into overlapping chunks
type Chunker struct {
	cfg ChunkerConfig
}

// NewChunker creates a new Chunker with the given config
func NewChunker(cfg ChunkerConfig) *Chunker {
	return &Chunker{cfg: cfg}
}

// ChunkText splits text into overlapping chunks, page-aware
func (c *Chunker) ChunkText(text string, pageNumber int) []Chunk {
	// Normalize whitespace
	text = normalizeText(text)
	if text == "" {
		return nil
	}

	// Split by sentences to avoid cutting in the middle of a sentence
	sentences := splitSentences(text)
	
	var chunks []Chunk
	var current strings.Builder
	idx := 0

	for i, sentence := range sentences {
		// If adding this sentence would exceed chunk size, save and start new chunk
		if current.Len() > 0 && current.Len()+len(sentence) > c.cfg.ChunkSize {
			chunkText := strings.TrimSpace(current.String())
			if chunkText != "" {
				chunks = append(chunks, Chunk{
					Content:    chunkText,
					Index:      idx,
					PageNumber: pageNumber,
				})
				idx++
			}

			// Start new chunk with overlap from previous sentences
			overlapStart := findOverlapStart(sentences[:i], c.cfg.ChunkOverlap)
			current.Reset()
			for _, s := range sentences[overlapStart:i] {
				current.WriteString(s)
				current.WriteString(" ")
			}
		}

		current.WriteString(sentence)
		current.WriteString(" ")
	}

	// Don't forget the last chunk
	if remaining := strings.TrimSpace(current.String()); remaining != "" {
		chunks = append(chunks, Chunk{
			Content:    remaining,
			Index:      idx,
			PageNumber: pageNumber,
		})
	}

	return chunks
}

// ChunkPages chunks a multi-page document, preserving page boundaries
func (c *Chunker) ChunkPages(pages []string) []Chunk {
	var allChunks []Chunk
	globalIdx := 0
	for pageNum, page := range pages {
		pageChunks := c.ChunkText(page, pageNum+1)
		for _, chunk := range pageChunks {
			chunk.Index = globalIdx
			allChunks = append(allChunks, chunk)
			globalIdx++
		}
	}
	return allChunks
}

// splitSentences splits text into sentences, keeping financial context intact
func splitSentences(text string) []string {
	var sentences []string
	var current strings.Builder

	runes := []rune(text)
	for i, r := range runes {
		current.WriteRune(r)

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

// findOverlapStart finds the starting sentence index for overlap
func findOverlapStart(sentences []string, overlapSize int) int {
	totalLen := 0
	for i := len(sentences) - 1; i >= 0; i-- {
		totalLen += len(sentences[i])
		if totalLen >= overlapSize {
			return i
		}
	}
	return 0
}

func normalizeText(text string) string {
	// Replace multiple spaces/newlines with single
	var sb strings.Builder
	prevSpace := false
	for _, r := range text {
		if unicode.IsSpace(r) {
			if !prevSpace {
				sb.WriteRune(' ')
			}
			prevSpace = true
		} else {
			sb.WriteRune(r)
			prevSpace = false
		}
	}
	return strings.TrimSpace(sb.String())
}
