// Package llm provides the Claude adapter that implements domain/rag.LLM.
package llm

import (
	"context"
	"encoding/base64"
	"fmt"
	"strings"

	"tadfuq/rag-service/internal/domain/rag"

	anthropic "github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

const (
	defaultModel     = "claude-3-5-sonnet-20241022"
	defaultMaxTokens = int64(4096)

	// System prompt enforces grounding in retrieved context ONLY.
	// STRICT: RAG answers must cite documents — no hallucination of
	// financial figures or forecasts.
	systemPrompt = `You are a financial document analyst for Tadfuq.
Your role is to answer questions based ONLY on the provided document excerpts.

Rules:
1. Base every answer strictly on the context below — do not invent data.
2. Be precise with numbers, percentages, and dates as they appear in the source.
3. If the answer is not in the context, say: "This information is not available in the ingested documents."
4. Never generate or estimate financial forecasts — that is handled by a separate engine.
5. Always reference the source document name and page when citing a fact.

Retrieved document context:
`
)

// ClaudeLLM implements domain/rag.LLM using Anthropic's Claude API.
type ClaudeLLM struct {
	client    *anthropic.Client
	model     string
	maxTokens int64
}

// NewClaudeLLM constructs the adapter. It satisfies the rag.LLM interface.
func NewClaudeLLM(apiKey string) *ClaudeLLM {
	c := anthropic.NewClient(option.WithAPIKey(apiKey))
	return &ClaudeLLM{
		client:    c,
		model:     defaultModel,
		maxTokens: defaultMaxTokens,
	}
}

// Answer generates a grounded response for the given question.
// contextText is the concatenated retrieved chunks.
// history is the prior conversation (chronological order).
func (cl *ClaudeLLM) Answer(
	ctx context.Context,
	question string,
	contextText string,
	history []rag.LLMMessage,
) (string, error) {
	// Build message slice from history + current question
	messages := make([]anthropic.MessageParam, 0, len(history)+1)
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
	messages = append(messages, anthropic.MessageParam{
		Role: anthropic.F(anthropic.MessageParamRoleUser),
		Content: anthropic.F([]anthropic.ContentBlockParamUnion{
			anthropic.TextBlockParam{
				Type: anthropic.F(anthropic.TextBlockParamTypeText),
				Text: anthropic.F(question),
			},
		}),
	})

	fullSystem := systemPrompt + contextText

	msg, err := cl.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.F(cl.model),
		MaxTokens: anthropic.F(cl.maxTokens),
		System: anthropic.F([]anthropic.TextBlockParam{
			{
				Type: anthropic.F(anthropic.TextBlockParamTypeText),
				Text: anthropic.F(fullSystem),
			},
		}),
		Messages: anthropic.F(messages),
	})
	if err != nil {
		return "", fmt.Errorf("claude.Answer: %w", err)
	}
	if len(msg.Content) == 0 {
		return "", fmt.Errorf("claude.Answer: empty response")
	}

	var sb strings.Builder
	for _, block := range msg.Content {
		if block.Type == "text" {
			sb.WriteString(block.Text)
		}
	}
	return sb.String(), nil
}

// ExtractFromFile uses Claude to extract text from a file (PDF, image)
// This implements the processor.claudeVision interface
func (cl *ClaudeLLM) ExtractFromFile(ctx context.Context, data []byte, mediaType string, hint string) (string, error) {
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

	msg, err := cl.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     anthropic.F(cl.model),
		MaxTokens: anthropic.F(cl.maxTokens),
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
