// Package embeddings provides the Voyage AI adapter that implements
// the domain rag.Embedder port.
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
	voyageAPIURL  = "https://api.voyageai.com/v1/embeddings"
	// voyage-finance-2 is purpose-built for financial documents.
	// Dimension: 1024.  Context window: 32 000 tokens.
	voyageModel   = "voyage-finance-2"
	maxBatchSize  = 128
)

// VoyageEmbedder implements domain/rag.Embedder via Voyage AI REST API.
type VoyageEmbedder struct {
	apiKey string
	client *http.Client
}

// NewVoyageEmbedder creates an embedder that implements rag.Embedder.
func NewVoyageEmbedder(apiKey string) *VoyageEmbedder {
	return &VoyageEmbedder{
		apiKey: apiKey,
		client: &http.Client{Timeout: 90 * time.Second},
	}
}

// EmbedDocuments embeds a batch of document chunks.
func (v *VoyageEmbedder) EmbedDocuments(ctx context.Context, texts []string) ([][]float32, error) {
	return v.embed(ctx, texts, "document")
}

// EmbedQuery embeds a single user query string.
func (v *VoyageEmbedder) EmbedQuery(ctx context.Context, query string) ([]float32, error) {
	vecs, err := v.embed(ctx, []string{query}, "query")
	if err != nil {
		return nil, err
	}
	if len(vecs) == 0 {
		return nil, fmt.Errorf("voyage: no embedding returned for query")
	}
	return vecs[0], nil
}

// ----------------------------------------------------------------
// Internal
// ----------------------------------------------------------------

type voyageReq struct {
	Input     []string `json:"input"`
	Model     string   `json:"model"`
	InputType string   `json:"input_type"`
}

type voyageResp struct {
	Data []struct {
		Index     int       `json:"index"`
		Embedding []float32 `json:"embedding"`
	} `json:"data"`
}

func (v *VoyageEmbedder) embed(ctx context.Context, texts []string, inputType string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, nil
	}
	all := make([][]float32, len(texts))

	for start := 0; start < len(texts); start += maxBatchSize {
		end := start + maxBatchSize
		if end > len(texts) {
			end = len(texts)
		}
		batch, err := v.callAPI(ctx, texts[start:end], inputType)
		if err != nil {
			return nil, fmt.Errorf("voyage batch [%d:%d]: %w", start, end, err)
		}
		copy(all[start:], batch)
	}
	return all, nil
}

func (v *VoyageEmbedder) callAPI(ctx context.Context, texts []string, inputType string) ([][]float32, error) {
	body, err := json.Marshal(voyageReq{Input: texts, Model: voyageModel, InputType: inputType})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, voyageAPIURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+v.apiKey)

	resp, err := v.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("voyage http: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("voyage API %d: %s", resp.StatusCode, raw)
	}

	var vr voyageResp
	if err := json.Unmarshal(raw, &vr); err != nil {
		return nil, fmt.Errorf("voyage parse: %w", err)
	}

	result := make([][]float32, len(texts))
	for _, d := range vr.Data {
		if d.Index < len(result) {
			result[d.Index] = d.Embedding
		}
	}
	return result, nil
}
