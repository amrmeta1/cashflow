package usecase

import (
	"fmt"
	"strings"

	"github.com/pkoukk/tiktoken-go"
)

// TextChunker defines interface for chunking text
type TextChunker interface {
	Chunk(text string) ([]string, error)
}

// TokenBasedChunker implements TextChunker using token counting
type TokenBasedChunker struct {
	minTokens  int
	maxTokens  int
	overlapMin int
	overlapMax int
	encoding   *tiktoken.Tiktoken
}

// NewTokenBasedChunker creates a new token-based chunker
func NewTokenBasedChunker(minTokens, maxTokens, overlapMin, overlapMax int) (*TokenBasedChunker, error) {
	// Use cl100k_base encoding (GPT-4/GPT-3.5 compatible)
	encoding, err := tiktoken.GetEncoding("cl100k_base")
	if err != nil {
		return nil, fmt.Errorf("failed to get tiktoken encoding: %w", err)
	}

	return &TokenBasedChunker{
		minTokens:  minTokens,
		maxTokens:  maxTokens,
		overlapMin: overlapMin,
		overlapMax: overlapMax,
		encoding:   encoding,
	}, nil
}

// Chunk splits text into chunks based on token count
func (c *TokenBasedChunker) Chunk(text string) ([]string, error) {
	if text == "" {
		return nil, fmt.Errorf("empty text")
	}

	// Split text into paragraphs
	paragraphs := strings.Split(text, "\n\n")
	var chunks []string
	var currentChunk strings.Builder
	var currentTokens int
	var previousChunk string

	for _, paragraph := range paragraphs {
		paragraph = strings.TrimSpace(paragraph)
		if paragraph == "" {
			continue
		}

		paragraphTokens := c.countTokens(paragraph)

		// If paragraph itself is too large, split by sentences
		if paragraphTokens > c.maxTokens {
			sentences := c.splitIntoSentences(paragraph)
			for _, sentence := range sentences {
				sentenceTokens := c.countTokens(sentence)

				// If sentence is still too large, split by words
				if sentenceTokens > c.maxTokens {
					words := strings.Fields(sentence)
					for _, word := range words {
						wordTokens := c.countTokens(word)
						if currentTokens+wordTokens > c.maxTokens {
							// Save current chunk
							if currentChunk.Len() > 0 {
								chunks = append(chunks, currentChunk.String())
								previousChunk = currentChunk.String()
								currentChunk.Reset()
								currentTokens = 0

								// Add overlap from previous chunk
								overlap := c.getOverlap(previousChunk)
								if overlap != "" {
									currentChunk.WriteString(overlap)
									currentChunk.WriteString(" ")
									currentTokens = c.countTokens(overlap)
								}
							}
						}
						currentChunk.WriteString(word)
						currentChunk.WriteString(" ")
						currentTokens += wordTokens
					}
				} else {
					// Add sentence to current chunk
					if currentTokens+sentenceTokens > c.maxTokens {
						// Save current chunk
						if currentChunk.Len() > 0 {
							chunks = append(chunks, currentChunk.String())
							previousChunk = currentChunk.String()
							currentChunk.Reset()
							currentTokens = 0

							// Add overlap from previous chunk
							overlap := c.getOverlap(previousChunk)
							if overlap != "" {
								currentChunk.WriteString(overlap)
								currentChunk.WriteString(" ")
								currentTokens = c.countTokens(overlap)
							}
						}
					}
					currentChunk.WriteString(sentence)
					currentChunk.WriteString(" ")
					currentTokens += sentenceTokens
				}
			}
		} else {
			// Add paragraph to current chunk
			if currentTokens+paragraphTokens > c.maxTokens {
				// Save current chunk if it meets minimum
				if currentChunk.Len() > 0 && currentTokens >= c.minTokens {
					chunks = append(chunks, currentChunk.String())
					previousChunk = currentChunk.String()
					currentChunk.Reset()
					currentTokens = 0

					// Add overlap from previous chunk
					overlap := c.getOverlap(previousChunk)
					if overlap != "" {
						currentChunk.WriteString(overlap)
						currentChunk.WriteString("\n\n")
						currentTokens = c.countTokens(overlap)
					}
				}
			}
			currentChunk.WriteString(paragraph)
			currentChunk.WriteString("\n\n")
			currentTokens += paragraphTokens
		}
	}

	// Add final chunk
	if currentChunk.Len() > 0 {
		chunks = append(chunks, strings.TrimSpace(currentChunk.String()))
	}

	if len(chunks) == 0 {
		return nil, fmt.Errorf("no chunks created")
	}

	return chunks, nil
}

// countTokens counts the number of tokens in text
func (c *TokenBasedChunker) countTokens(text string) int {
	tokens := c.encoding.Encode(text, nil, nil)
	return len(tokens)
}

// splitIntoSentences splits text into sentences
func (c *TokenBasedChunker) splitIntoSentences(text string) []string {
	// Simple sentence splitting by common punctuation
	text = strings.ReplaceAll(text, ". ", ".|")
	text = strings.ReplaceAll(text, "! ", "!|")
	text = strings.ReplaceAll(text, "? ", "?|")
	sentences := strings.Split(text, "|")

	var result []string
	for _, s := range sentences {
		s = strings.TrimSpace(s)
		if s != "" {
			result = append(result, s)
		}
	}
	return result
}

// getOverlap extracts overlap tokens from previous chunk
func (c *TokenBasedChunker) getOverlap(previousChunk string) string {
	if previousChunk == "" {
		return ""
	}

	tokens := c.encoding.Encode(previousChunk, nil, nil)
	totalTokens := len(tokens)

	// Calculate adaptive overlap (50-80 tokens based on chunk size)
	overlapTokens := c.overlapMin
	if totalTokens > c.minTokens {
		ratio := float64(totalTokens-c.minTokens) / float64(c.maxTokens-c.minTokens)
		overlapTokens = c.overlapMin + int(ratio*float64(c.overlapMax-c.overlapMin))
	}

	if overlapTokens > totalTokens {
		overlapTokens = totalTokens
	}

	// Get last N tokens
	startIdx := totalTokens - overlapTokens
	if startIdx < 0 {
		startIdx = 0
	}

	overlapTokenSlice := tokens[startIdx:]
	overlapText := c.encoding.Decode(overlapTokenSlice)

	return overlapText
}
