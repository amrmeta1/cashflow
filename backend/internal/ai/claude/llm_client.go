package llm

import "context"

// Message represents a chat message
type Message struct {
	Role    string `json:"role"` // system, user, assistant
	Content string `json:"content"`
}

// CompletionRequest represents a request to the LLM
type CompletionRequest struct {
	Messages    []Message `json:"messages"`
	Temperature float64   `json:"temperature,omitempty"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
}

// CompletionResponse represents a response from the LLM
type CompletionResponse struct {
	Content string `json:"content"`
	Model   string `json:"model"`
	Tokens  int    `json:"tokens"`
}

// LLMClient defines interface for LLM interactions
type LLMClient interface {
	// Complete generates a completion for the given messages
	Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error)
}

// OpenAILLMClient implements LLMClient using OpenAI API
type OpenAILLMClient struct {
	apiKey string
	model  string
}

// NewOpenAILLMClient creates a new OpenAI LLM client
func NewOpenAILLMClient(apiKey, model string) *OpenAILLMClient {
	return &OpenAILLMClient{
		apiKey: apiKey,
		model:  model,
	}
}

// Complete generates a completion (stub - not implemented)
func (c *OpenAILLMClient) Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error) {
	// Stub implementation
	// Future: Call OpenAI chat completions API
	return nil, nil
}
