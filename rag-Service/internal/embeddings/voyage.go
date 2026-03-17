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
	VoyageAPIURL    = "https://api.voyageai.com/v1/embeddings"
	VoyageModel     = "voyage-finance-2"  // Specialized for financial documents
	EmbeddingDim    = 1024
	MaxBatchSize    = 128
)

// Client handles Voyage AI embeddings
type Client struct {
	apiKey     string
	httpClient *http.Client
	model      string
}

// New creates a new Voyage embeddings client
func New(apiKey string) *Client {
	return &Client{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
		model: VoyageModel,
	}
}

type voyageRequest struct {
	Input     []string `json:"input"`
	Model     string   `json:"model"`
	InputType string   `json:"input_type"`
}

type voyageResponse struct {
	Object string `json:"object"`
	Data   []struct {
		Object    string    `json:"object"`
		Embedding []float32 `json:"embedding"`
		Index     int       `json:"index"`
	} `json:"data"`
	Model string `json:"model"`
	Usage struct {
		TotalTokens int `json:"total_tokens"`
	} `json:"usage"`
}

// EmbedDocuments embeds a batch of text documents
func (c *Client) EmbedDocuments(ctx context.Context, texts []string) ([][]float32, error) {
	return c.embed(ctx, texts, "document")
}

// EmbedQuery embeds a single query string
func (c *Client) EmbedQuery(ctx context.Context, query string) ([]float32, error) {
	embeddings, err := c.embed(ctx, []string{query}, "query")
	if err != nil {
		return nil, err
	}
	if len(embeddings) == 0 {
		return nil, fmt.Errorf("no embedding returned")
	}
	return embeddings[0], nil
}

// embed calls the Voyage AI API
func (c *Client) embed(ctx context.Context, texts []string, inputType string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, nil
	}

	var allEmbeddings [][]float32

	// Process in batches
	for i := 0; i < len(texts); i += MaxBatchSize {
		end := i + MaxBatchSize
		if end > len(texts) {
			end = len(texts)
		}
		batch := texts[i:end]

		embeddings, err := c.embedBatch(ctx, batch, inputType)
		if err != nil {
			return nil, fmt.Errorf("batch %d: %w", i/MaxBatchSize, err)
		}
		allEmbeddings = append(allEmbeddings, embeddings...)
	}

	return allEmbeddings, nil
}

func (c *Client) embedBatch(ctx context.Context, texts []string, inputType string) ([][]float32, error) {
	reqBody := voyageRequest{
		Input:     texts,
		Model:     c.model,
		InputType: inputType,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", VoyageAPIURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("voyage API request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("voyage API error %d: %s", resp.StatusCode, string(respBody))
	}

	var voyageResp voyageResponse
	if err := json.Unmarshal(respBody, &voyageResp); err != nil {
		return nil, fmt.Errorf("parsing voyage response: %w", err)
	}

	// Sort by index to maintain order
	embeddings := make([][]float32, len(texts))
	for _, d := range voyageResp.Data {
		if d.Index < len(embeddings) {
			embeddings[d.Index] = d.Embedding
		}
	}

	return embeddings, nil
}
