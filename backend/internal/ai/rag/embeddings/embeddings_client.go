package embeddings

import "context"

// EmbeddingsClient defines interface for generating text embeddings
type EmbeddingsClient interface {
	// GenerateEmbedding generates a vector embedding for the given text
	GenerateEmbedding(ctx context.Context, text string) ([]float32, error)

	// GenerateBatchEmbeddings generates embeddings for multiple texts
	GenerateBatchEmbeddings(ctx context.Context, texts []string) ([][]float32, error)
}

// OpenAIEmbeddingsClient implements EmbeddingsClient using OpenAI API
type OpenAIEmbeddingsClient struct {
	apiKey string
	model  string
}

// NewOpenAIEmbeddingsClient creates a new OpenAI embeddings client
func NewOpenAIEmbeddingsClient(apiKey, model string) *OpenAIEmbeddingsClient {
	return &OpenAIEmbeddingsClient{
		apiKey: apiKey,
		model:  model,
	}
}

// GenerateEmbedding generates a single embedding (stub - not implemented)
func (c *OpenAIEmbeddingsClient) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	// Stub implementation
	// Future: Call OpenAI embeddings API
	return nil, nil
}

// GenerateBatchEmbeddings generates multiple embeddings (stub - not implemented)
func (c *OpenAIEmbeddingsClient) GenerateBatchEmbeddings(ctx context.Context, texts []string) ([][]float32, error) {
	// Stub implementation
	// Future: Call OpenAI embeddings API with batch
	return nil, nil
}
