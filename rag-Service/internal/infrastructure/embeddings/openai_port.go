package embeddings

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	openaiAPIURL      = "https://api.openai.com/v1/embeddings"
	openaiModel       = "text-embedding-3-small"
	openaiDimensions  = 1024 // Reduced from native 1536 to match Voyage
	openaiMaxBatch    = 2048
	openaiTimeout     = 90 * time.Second
)

// OpenAIEmbedder implements domain/rag.Embedder via OpenAI REST API
type OpenAIEmbedder struct {
	apiKey string
	client *http.Client
}

// NewOpenAIEmbedder creates an embedder that implements rag.Embedder
func NewOpenAIEmbedder(apiKey string) *OpenAIEmbedder {
	return &OpenAIEmbedder{
		apiKey: apiKey,
		client: &http.Client{Timeout: openaiTimeout},
	}
}

// EmbedDocuments embeds a batch of document chunks
func (o *OpenAIEmbedder) EmbedDocuments(ctx context.Context, texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, nil
	}

	// Process in batches if needed
	if len(texts) > openaiMaxBatch {
		return o.embedInBatches(ctx, texts)
	}

	return o.embed(ctx, texts)
}

// EmbedQuery embeds a single user query string
func (o *OpenAIEmbedder) EmbedQuery(ctx context.Context, query string) ([]float32, error) {
	vecs, err := o.embed(ctx, []string{query})
	if err != nil {
		return nil, err
	}
	if len(vecs) == 0 {
		return nil, fmt.Errorf("openai: no embeddings returned")
	}
	return vecs[0], nil
}

// embedInBatches splits large requests into multiple API calls
func (o *OpenAIEmbedder) embedInBatches(ctx context.Context, texts []string) ([][]float32, error) {
	var allEmbeddings [][]float32

	for i := 0; i < len(texts); i += openaiMaxBatch {
		end := i + openaiMaxBatch
		if end > len(texts) {
			end = len(texts)
		}

		batch := texts[i:end]
		embeddings, err := o.embed(ctx, batch)
		if err != nil {
			return nil, fmt.Errorf("batch [%d:%d]: %w", i, end, err)
		}

		allEmbeddings = append(allEmbeddings, embeddings...)
	}

	return allEmbeddings, nil
}

// openaiRequest represents the API request structure
type openaiRequest struct {
	Input          []string `json:"input"`
	Model          string   `json:"model"`
	Dimensions     int      `json:"dimensions"`
	EncodingFormat string   `json:"encoding_format"`
}

// openaiResponse represents the API response structure
type openaiResponse struct {
	Data []struct {
		Embedding []float32 `json:"embedding"`
		Index     int       `json:"index"`
	} `json:"data"`
	Model string `json:"model"`
	Usage struct {
		PromptTokens int `json:"prompt_tokens"`
		TotalTokens  int `json:"total_tokens"`
	} `json:"usage"`
}

// openaiErrorResponse represents error responses from the API
type openaiErrorResponse struct {
	Error struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code"`
	} `json:"error"`
}

// embed calls the OpenAI API with retry logic
func (o *OpenAIEmbedder) embed(ctx context.Context, texts []string) ([][]float32, error) {
	var result [][]float32

	retryConfig := DefaultRetryConfig()
	err := RetryWithBackoff(ctx, retryConfig, func() error {
		embeddings, err := o.callAPI(ctx, texts)
		if err != nil {
			return err
		}
		result = embeddings
		return nil
	})

	return result, err
}

// callAPI makes a single API call to OpenAI
func (o *OpenAIEmbedder) callAPI(ctx context.Context, texts []string) ([][]float32, error) {
	reqBody := openaiRequest{
		Input:          texts,
		Model:          openaiModel,
		Dimensions:     openaiDimensions,
		EncodingFormat: "float",
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("openai: marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", openaiAPIURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("openai: create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+o.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := o.client.Do(req)
	if err != nil {
		return nil, &RetryableError{
			Err:       fmt.Errorf("openai: http request: %w", err),
			Retryable: true,
		}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("openai: read response: %w", err)
	}

	// Handle non-200 responses
	if resp.StatusCode != http.StatusOK {
		var errResp openaiErrorResponse
		if err := json.Unmarshal(body, &errResp); err == nil && errResp.Error.Message != "" {
			return nil, &RetryableError{
				Err:        fmt.Errorf("openai API %d: %s", resp.StatusCode, errResp.Error.Message),
				Retryable:  IsRetryable(resp.StatusCode),
				StatusCode: resp.StatusCode,
			}
		}
		return nil, &RetryableError{
			Err:        fmt.Errorf("openai API %d: %s", resp.StatusCode, string(body)),
			Retryable:  IsRetryable(resp.StatusCode),
			StatusCode: resp.StatusCode,
		}
	}

	var apiResp openaiResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("openai: unmarshal response: %w", err)
	}

	if len(apiResp.Data) != len(texts) {
		return nil, fmt.Errorf("openai: expected %d embeddings, got %d", len(texts), len(apiResp.Data))
	}

	// Extract embeddings in order
	embeddings := make([][]float32, len(texts))
	for _, item := range apiResp.Data {
		if item.Index < 0 || item.Index >= len(embeddings) {
			return nil, fmt.Errorf("openai: invalid embedding index %d", item.Index)
		}
		
		// Verify dimension
		if len(item.Embedding) != openaiDimensions {
			return nil, fmt.Errorf("openai: expected %d dimensions, got %d", openaiDimensions, len(item.Embedding))
		}
		
		embeddings[item.Index] = item.Embedding
	}

	return embeddings, nil
}
