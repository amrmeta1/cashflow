package embeddings

import (
	"fmt"

	"tadfuq/rag-service/internal/domain/rag"
)

// NewEmbedder creates an embedder based on the specified provider
// provider: "voyage" (default) or "openai"
// Returns an implementation of rag.Embedder interface
func NewEmbedder(provider, voyageKey, openaiKey string) (rag.Embedder, error) {
	switch provider {
	case "openai":
		if openaiKey == "" {
			return nil, fmt.Errorf("OPENAI_API_KEY is required when provider is 'openai'")
		}
		return NewOpenAIEmbedder(openaiKey), nil

	case "voyage", "":
		// Default to Voyage if provider is empty or explicitly "voyage"
		if voyageKey == "" {
			return nil, fmt.Errorf("VOYAGE_API_KEY is required when provider is 'voyage'")
		}
		return NewVoyageEmbedder(voyageKey), nil

	default:
		return nil, fmt.Errorf("unknown embedding provider: %s (must be 'voyage' or 'openai')", provider)
	}
}
