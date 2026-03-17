package llm

import (
	"context"
	"fmt"

	"tadfuq/rag-service/internal/domain/rag"

	"github.com/sashabaranov/go-openai"
)

// OpenAILLM implements domain/rag.LLM using OpenAI's GPT-4 API.
type OpenAILLM struct {
	client    *openai.Client
	model     string
	maxTokens int
}

// NewOpenAILLM creates an OpenAI LLM adapter.
func NewOpenAILLM(apiKey, model string, maxTokens int) *OpenAILLM {
	client := openai.NewClient(apiKey)
	return &OpenAILLM{
		client:    client,
		model:     model,
		maxTokens: maxTokens,
	}
}

// Answer generates a grounded answer using GPT-4.
func (o *OpenAILLM) Answer(
	ctx context.Context,
	question string,
	contextText string,
	history []rag.LLMMessage,
) (string, error) {
	// Build system prompt
	systemPrompt := `You are a financial analysis assistant. Answer questions based ONLY on the provided context.
If the context doesn't contain enough information to answer the question, say so clearly.
Be concise, accurate, and cite specific information from the context when possible.`

	// Build messages array
	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: systemPrompt,
		},
	}

	// Add conversation history
	for _, msg := range history {
		role := openai.ChatMessageRoleUser
		if msg.Role == "assistant" {
			role = openai.ChatMessageRoleAssistant
		}
		messages = append(messages, openai.ChatCompletionMessage{
			Role:    role,
			Content: msg.Content,
		})
	}

	// Add context and current question
	userPrompt := fmt.Sprintf(`Context from documents:
---
%s
---

Question: %s

Answer based on the context above:`, contextText, question)

	messages = append(messages, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: userPrompt,
	})

	// Call OpenAI API
	resp, err := o.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model:       o.model,
		Messages:    messages,
		MaxTokens:   o.maxTokens,
		Temperature: 0.7,
	})
	if err != nil {
		return "", fmt.Errorf("openai.Answer: %w", err)
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("openai.Answer: no response from API")
	}

	return resp.Choices[0].Message.Content, nil
}

// ExtractFromFile extracts text from images/PDFs using GPT-4 Vision.
// This satisfies the claudeVision interface needed by DocumentParser.
func (o *OpenAILLM) ExtractFromFile(ctx context.Context, data []byte, mediaType, hint string) (string, error) {
	// For now, return a simple message since GPT-4 Vision requires different handling
	// In production, you would use GPT-4 Vision API with base64 encoded images
	return "", fmt.Errorf("openai vision extraction not yet implemented - please use text-based PDFs or implement GPT-4 Vision support")
}
