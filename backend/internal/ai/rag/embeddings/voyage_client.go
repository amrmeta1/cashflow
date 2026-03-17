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
	voyageAPIURL     = "https://api.voyageai.com/v1/embeddings"
	voyageModel      = "voyage-2"
	voyageTimeout    = 30 * time.Second
	voyageDimensions = 1024
)

// VoyageClient implements EmbeddingsClient using Voyage AI API
type VoyageClient struct {
	apiKey     string
	httpClient *http.Client
	model      string
}

// NewVoyageClient creates a new Voyage AI embeddings client
func NewVoyageClient(apiKey string) *VoyageClient {
	return &VoyageClient{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: voyageTimeout,
		},
		model: voyageModel,
	}
}

// voyageRequest represents the Voyage API request payload
type voyageRequest struct {
	Input     interface{} `json:"input"` // string or []string
	Model     string      `json:"model"`
	InputType string      `json:"input_type"` // "document" or "query"
}

// voyageResponse represents the Voyage API response
type voyageResponse struct {
	Data []struct {
		Embedding []float32 `json:"embedding"`
		Index     int       `json:"index"`
	} `json:"data"`
	Model string `json:"model"`
	Usage struct {
		TotalTokens int `json:"total_tokens"`
	} `json:"usage"`
}

// GenerateEmbedding generates a single embedding for the given text
func (c *VoyageClient) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	if text == "" {
		return nil, fmt.Errorf("text cannot be empty")
	}

	req := voyageRequest{
		Input:     text,
		Model:     c.model,
		InputType: "document",
	}

	resp, err := c.callAPI(ctx, req)
	if err != nil {
		return nil, err
	}

	if len(resp.Data) == 0 {
		return nil, fmt.Errorf("no embeddings returned from Voyage API")
	}

	return resp.Data[0].Embedding, nil
}

// GenerateBatchEmbeddings generates embeddings for multiple texts
func (c *VoyageClient) GenerateBatchEmbeddings(ctx context.Context, texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, fmt.Errorf("texts cannot be empty")
	}

	req := voyageRequest{
		Input:     texts,
		Model:     c.model,
		InputType: "document",
	}

	resp, err := c.callAPI(ctx, req)
	if err != nil {
		return nil, err
	}

	if len(resp.Data) != len(texts) {
		return nil, fmt.Errorf("expected %d embeddings, got %d", len(texts), len(resp.Data))
	}

	// Sort by index to ensure correct order
	embeddings := make([][]float32, len(texts))
	for _, item := range resp.Data {
		if item.Index >= len(embeddings) {
			return nil, fmt.Errorf("invalid index %d in response", item.Index)
		}
		embeddings[item.Index] = item.Embedding
	}

	return embeddings, nil
}

// callAPI makes the HTTP request to Voyage API
func (c *VoyageClient) callAPI(ctx context.Context, req voyageRequest) (*voyageResponse, error) {
	// Marshal request body
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", voyageAPIURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	// Make request
	httpResp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to call Voyage API: %w", err)
	}
	defer httpResp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check status code
	if httpResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Voyage API error (status %d): %s", httpResp.StatusCode, string(respBody))
	}

	// Parse response
	var resp voyageResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &resp, nil
}
