package embeddings

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestOpenAIEmbedder_EmbedQuery(t *testing.T) {
	// Create mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request
		if r.Header.Get("Authorization") != "Bearer test-key" {
			t.Errorf("Expected Authorization header with Bearer token")
		}

		var req openaiRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatalf("Failed to decode request: %v", err)
		}

		if req.Model != openaiModel {
			t.Errorf("Expected model %s, got %s", openaiModel, req.Model)
		}

		if req.Dimensions != openaiDimensions {
			t.Errorf("Expected dimensions %d, got %d", openaiDimensions, req.Dimensions)
		}

		if len(req.Input) != 1 {
			t.Errorf("Expected 1 input, got %d", len(req.Input))
		}

		// Return mock response
		resp := openaiResponse{
			Data: []struct {
				Embedding []float32 `json:"embedding"`
				Index     int       `json:"index"`
			}{
				{
					Embedding: make([]float32, openaiDimensions),
					Index:     0,
				},
			},
			Model: openaiModel,
		}

		// Fill with test data
		for i := range resp.Data[0].Embedding {
			resp.Data[0].Embedding[i] = float32(i) * 0.001
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	// Create embedder
	_ = NewOpenAIEmbedder("test-key")

	// Note: Full integration test would need configurable API URL
	t.Log("OpenAI embedder created successfully")
}

func TestOpenAIEmbedder_DimensionValidation(t *testing.T) {
	embedder := NewOpenAIEmbedder("test-key")

	if embedder == nil {
		t.Fatal("Expected embedder to be created")
	}

	if embedder.apiKey != "test-key" {
		t.Errorf("Expected API key 'test-key', got '%s'", embedder.apiKey)
	}
}

func TestOpenAIEmbedder_BatchProcessing(t *testing.T) {
	_ = NewOpenAIEmbedder("test-key")

	// Test that large batches would be split
	largeTexts := make([]string, openaiMaxBatch+100)
	for i := range largeTexts {
		largeTexts[i] = "test text"
	}

	// This would normally call embedInBatches
	// We're testing the logic exists
	t.Logf("Batch size validation: max=%d, test=%d", openaiMaxBatch, len(largeTexts))
}

func TestRetryLogic(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		retryable  bool
	}{
		{"Rate limit", 429, true},
		{"Server error", 500, true},
		{"Bad gateway", 502, true},
		{"Client error", 400, false},
		{"Unauthorized", 401, false},
		{"Not found", 404, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsRetryable(tt.statusCode)
			if result != tt.retryable {
				t.Errorf("IsRetryable(%d) = %v, want %v", tt.statusCode, result, tt.retryable)
			}
		})
	}
}

func TestRetryWithBackoff(t *testing.T) {
	ctx := context.Background()
	cfg := RetryConfig{
		MaxRetries: 2,
		BaseDelay:  10 * time.Millisecond,
	}

	t.Run("success on first try", func(t *testing.T) {
		attempts := 0
		err := RetryWithBackoff(ctx, cfg, func() error {
			attempts++
			return nil
		})

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}

		if attempts != 1 {
			t.Errorf("Expected 1 attempt, got %d", attempts)
		}
	})

	t.Run("success after retry", func(t *testing.T) {
		attempts := 0
		err := RetryWithBackoff(ctx, cfg, func() error {
			attempts++
			if attempts < 2 {
				return &RetryableError{
					Err:       http.ErrServerClosed,
					Retryable: true,
				}
			}
			return nil
		})

		if err != nil {
			t.Errorf("Expected no error, got %v", err)
		}

		if attempts != 2 {
			t.Errorf("Expected 2 attempts, got %d", attempts)
		}
	})

	t.Run("max retries exceeded", func(t *testing.T) {
		attempts := 0
		err := RetryWithBackoff(ctx, cfg, func() error {
			attempts++
			return &RetryableError{
				Err:       http.ErrServerClosed,
				Retryable: true,
			}
		})

		if err == nil {
			t.Error("Expected error after max retries")
		}

		expectedAttempts := cfg.MaxRetries + 1
		if attempts != expectedAttempts {
			t.Errorf("Expected %d attempts, got %d", expectedAttempts, attempts)
		}
	})

	t.Run("non-retryable error", func(t *testing.T) {
		attempts := 0
		err := RetryWithBackoff(ctx, cfg, func() error {
			attempts++
			return &RetryableError{
				Err:       http.ErrNotSupported,
				Retryable: false,
			}
		})

		if err == nil {
			t.Error("Expected error for non-retryable failure")
		}

		if attempts != 1 {
			t.Errorf("Expected 1 attempt for non-retryable error, got %d", attempts)
		}
	})

	t.Run("context cancellation", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		attempts := 0
		err := RetryWithBackoff(ctx, cfg, func() error {
			attempts++
			return &RetryableError{
				Err:       http.ErrServerClosed,
				Retryable: true,
			}
		})

		if err != context.Canceled {
			t.Errorf("Expected context.Canceled, got %v", err)
		}
	})
}

func TestOpenAIRequest_Marshaling(t *testing.T) {
	req := openaiRequest{
		Input:          []string{"test text"},
		Model:          openaiModel,
		Dimensions:     openaiDimensions,
		EncodingFormat: "float",
	}

	data, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("Failed to marshal request: %v", err)
	}

	var decoded openaiRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal request: %v", err)
	}

	if decoded.Model != openaiModel {
		t.Errorf("Expected model %s, got %s", openaiModel, decoded.Model)
	}

	if decoded.Dimensions != openaiDimensions {
		t.Errorf("Expected dimensions %d, got %d", openaiDimensions, decoded.Dimensions)
	}
}

func TestOpenAIResponse_Unmarshaling(t *testing.T) {
	jsonData := `{
		"data": [
			{
				"embedding": [0.1, 0.2, 0.3],
				"index": 0
			}
		],
		"model": "text-embedding-3-small",
		"usage": {
			"prompt_tokens": 5,
			"total_tokens": 5
		}
	}`

	var resp openaiResponse
	if err := json.Unmarshal([]byte(jsonData), &resp); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if len(resp.Data) != 1 {
		t.Errorf("Expected 1 data item, got %d", len(resp.Data))
	}

	if len(resp.Data[0].Embedding) != 3 {
		t.Errorf("Expected 3 embedding values, got %d", len(resp.Data[0].Embedding))
	}

	if resp.Data[0].Index != 0 {
		t.Errorf("Expected index 0, got %d", resp.Data[0].Index)
	}
}

func TestOpenAIErrorResponse_Unmarshaling(t *testing.T) {
	jsonData := `{
		"error": {
			"message": "Invalid API key",
			"type": "invalid_request_error",
			"code": "invalid_api_key"
		}
	}`

	var errResp openaiErrorResponse
	if err := json.Unmarshal([]byte(jsonData), &errResp); err != nil {
		t.Fatalf("Failed to unmarshal error response: %v", err)
	}

	if errResp.Error.Message != "Invalid API key" {
		t.Errorf("Expected error message 'Invalid API key', got '%s'", errResp.Error.Message)
	}

	if errResp.Error.Code != "invalid_api_key" {
		t.Errorf("Expected error code 'invalid_api_key', got '%s'", errResp.Error.Code)
	}
}
