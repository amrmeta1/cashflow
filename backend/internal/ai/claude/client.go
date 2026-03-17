package llm

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
	claudeAPIURL    = "https://api.anthropic.com/v1/messages"
	claudeModel     = "claude-3-5-sonnet-20241022"
	claudeVersion   = "2023-06-01"
	claudeTimeout   = 60 * time.Second
	claudeMaxTokens = 1024
)

// ClaudeClient implements LLMClient using Anthropic Claude API
type ClaudeClient struct {
	apiKey     string
	httpClient *http.Client
	model      string
}

// NewClaudeClient creates a new Claude AI client
func NewClaudeClient(apiKey string) *ClaudeClient {
	return &ClaudeClient{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: claudeTimeout,
		},
		model: claudeModel,
	}
}

// claudeMessage represents a message in Claude API format
type claudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// claudeRequest represents the Claude API request payload
type claudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	Messages  []claudeMessage `json:"messages"`
}

// claudeResponse represents the Claude API response
type claudeResponse struct {
	ID      string `json:"id"`
	Type    string `json:"type"`
	Role    string `json:"role"`
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	Model string `json:"model"`
	Usage struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

// Complete generates a completion for the given messages
func (c *ClaudeClient) Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error) {
	// Convert messages to Claude format
	claudeMessages := make([]claudeMessage, len(req.Messages))
	for i, msg := range req.Messages {
		claudeMessages[i] = claudeMessage{
			Role:    msg.Role,
			Content: msg.Content,
		}
	}

	// Set default max tokens if not specified
	maxTokens := req.MaxTokens
	if maxTokens == 0 {
		maxTokens = claudeMaxTokens
	}

	// Build request
	claudeReq := claudeRequest{
		Model:     c.model,
		MaxTokens: maxTokens,
		Messages:  claudeMessages,
	}

	// Marshal request body
	body, err := json.Marshal(claudeReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", claudeAPIURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", c.apiKey)
	httpReq.Header.Set("anthropic-version", claudeVersion)

	// Make request
	httpResp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to call Claude API: %w", err)
	}
	defer httpResp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check status code
	if httpResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Claude API error (status %d): %s", httpResp.StatusCode, string(respBody))
	}

	// Parse response
	var claudeResp claudeResponse
	if err := json.Unmarshal(respBody, &claudeResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Extract text content
	var content string
	if len(claudeResp.Content) > 0 && claudeResp.Content[0].Type == "text" {
		content = claudeResp.Content[0].Text
	}

	return &CompletionResponse{
		Content: content,
		Model:   claudeResp.Model,
		Tokens:  claudeResp.Usage.InputTokens + claudeResp.Usage.OutputTokens,
	}, nil
}
