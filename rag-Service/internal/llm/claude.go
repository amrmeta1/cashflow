package llm

import (
	"context"
	"encoding/base64"
	"fmt"
	"strings"

	anthropic "github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

const (
	ModelSonnet = "claude-3-5-sonnet-20241022"
	MaxTokens   = 4096
)

// Client wraps the Anthropic API client
type Client struct {
	client *anthropic.Client
	model  string
}

// New creates a new Claude client
func New(apiKey string) *Client {
	c := anthropic.NewClient(option.WithAPIKey(apiKey))
	return &Client{client: c, model: ModelSonnet}
}

// ExtractFromFile uses Claude to extract text from a file (PDF, image)
// This implements the processor.ClaudeExtractor interface
func (c *Client) ExtractFromFile(ctx context.Context, data []byte, mediaType string, hint string) (string, error) {
	encoded := base64.StdEncoding.EncodeToString(data)

	var contentBlock anthropic.ContentBlockParamUnion

	if mediaType == "application/pdf" {
		// PDF as document block
		contentBlock = anthropic.DocumentBlockParam{
			Type: anthropic.F(anthropic.DocumentBlockParamTypeDocument),
			Source: anthropic.F(anthropic.Base64PDFSourceParam{
				Type:      anthropic.F(anthropic.Base64PDFSourceTypeBase64),
				MediaType: anthropic.F(anthropic.Base64PDFSourceMediaTypeApplicationPDF),
				Data:      anthropic.F(encoded),
			}),
		}
	} else {
		// Image block
		contentBlock = anthropic.ImageBlockParam{
			Type: anthropic.F(anthropic.ImageBlockParamTypeImage),
			Source: anthropic.F(anthropic.ImageBlockParamSource{
				Type:      anthropic.F(anthropic.ImageBlockParamSourceTypeBase64),
				MediaType: anthropic.F(anthropic.ImageBlockParamSourceMediaType(mediaType)),
				Data:      anthropic.F(encoded),
			}),
		}
	}

	msg, err := c.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.F(c.model),
		MaxTokens: anthropic.F(int64(MaxTokens)),
		Messages: anthropic.F([]anthropic.MessageParam{
			{
				Role: anthropic.F(anthropic.MessageParamRoleUser),
				Content: anthropic.F([]anthropic.ContentBlockParamUnion{
					contentBlock,
					anthropic.TextBlockParam{
						Type: anthropic.F(anthropic.TextBlockParamTypeText),
						Text: anthropic.F(hint),
					},
				}),
			},
		}),
	})
	if err != nil {
		return "", fmt.Errorf("claude API error: %w", err)
	}

	if len(msg.Content) == 0 {
		return "", fmt.Errorf("empty response from Claude")
	}

	var sb strings.Builder
	for _, block := range msg.Content {
		if block.Type == "text" {
			sb.WriteString(block.Text)
		}
	}
	return sb.String(), nil
}

// Chat sends a RAG-enhanced chat message and returns the response
func (c *Client) Chat(ctx context.Context, question string, context_ string, history []Message) (string, error) {
	systemPrompt := `You are an expert financial analyst assistant. You help users analyze financial statements, reports, and documents.

When answering questions:
1. Base your answers ONLY on the provided context from the financial documents
2. Be precise with numbers, dates, and financial metrics
3. If information is not in the context, say so clearly
4. Format numbers clearly (e.g., $1.2M, 15.3%)
5. Cite the source document when relevant

Context from financial documents:
` + context_

	// Build message history
	var messages []anthropic.MessageParam
	for _, h := range history {
		role := anthropic.MessageParamRoleUser
		if h.Role == "assistant" {
			role = anthropic.MessageParamRoleAssistant
		}
		messages = append(messages, anthropic.MessageParam{
			Role: anthropic.F(role),
			Content: anthropic.F([]anthropic.ContentBlockParamUnion{
				anthropic.TextBlockParam{
					Type: anthropic.F(anthropic.TextBlockParamTypeText),
					Text: anthropic.F(h.Content),
				},
			}),
		})
	}

	// Add current question
	messages = append(messages, anthropic.MessageParam{
		Role: anthropic.F(anthropic.MessageParamRoleUser),
		Content: anthropic.F([]anthropic.ContentBlockParamUnion{
			anthropic.TextBlockParam{
				Type: anthropic.F(anthropic.TextBlockParamTypeText),
				Text: anthropic.F(question),
			},
		}),
	})

	msg, err := c.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.F(c.model),
		MaxTokens: anthropic.F(int64(MaxTokens)),
		System: anthropic.F([]anthropic.TextBlockParam{
			{
				Type: anthropic.F(anthropic.TextBlockParamTypeText),
				Text: anthropic.F(systemPrompt),
			},
		}),
		Messages: anthropic.F(messages),
	})
	if err != nil {
		return "", fmt.Errorf("claude chat error: %w", err)
	}

	if len(msg.Content) == 0 {
		return "", fmt.Errorf("empty response from Claude")
	}
	return msg.Content[0].Text, nil
}

// ExtractStructured extracts structured financial data from text
func (c *Client) ExtractStructured(ctx context.Context, text string) (string, error) {
	prompt := `Analyze this financial document and extract structured data in JSON format.
Include:
- document_type: (income_statement, balance_sheet, cash_flow, etc.)
- period: fiscal period and year
- currency: detected currency
- key_metrics: object with important financial metrics and their values
- revenue_items: array of revenue line items with amounts
- expense_items: array of expense line items with amounts  
- assets: if balance sheet, list major asset categories
- liabilities: if balance sheet, list major liability categories
- highlights: array of key financial insights

Document text:
` + text + `

Respond with ONLY valid JSON, no markdown code blocks.`

	msg, err := c.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.F(c.model),
		MaxTokens: anthropic.F(int64(MaxTokens)),
		Messages: anthropic.F([]anthropic.MessageParam{
			{
				Role: anthropic.F(anthropic.MessageParamRoleUser),
				Content: anthropic.F([]anthropic.ContentBlockParamUnion{
					anthropic.TextBlockParam{
						Type: anthropic.F(anthropic.TextBlockParamTypeText),
						Text: anthropic.F(prompt),
					},
				}),
			},
		}),
	})
	if err != nil {
		return "", fmt.Errorf("claude extract error: %w", err)
	}
	if len(msg.Content) == 0 {
		return "", fmt.Errorf("empty response")
	}
	return msg.Content[0].Text, nil
}

// Message is a simple chat message for history
type Message struct {
	Role    string
	Content string
}
