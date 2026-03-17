package router

import (
	"context"
	"fmt"
	"strings"

	"github.com/finch-co/cashflow/internal/models"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	llm "github.com/finch-co/cashflow/internal/ai/claude"
	ragDomain "github.com/finch-co/cashflow/internal/ai/rag/domain"
	ragUsecase "github.com/finch-co/cashflow/internal/ai/rag/usecase"
	"github.com/finch-co/cashflow/internal/liquidity"
	// "github.com/finch-co/cashflow/internal/ai/ragclient" // TODO: Package deleted in refactoring
)

// HybridRouter intelligently routes questions to forecast, RAG, hybrid, or advice engines
type HybridRouter struct {
	forecastUC *liquidity.ForecastUseCase
	// ragClient      *struct{}RagClient // TODO: Package deleted in refactoring
	ragUseCase     *ragUsecase.RagQueryUseCase
	llmClient      llm.LLMClient
	decisionEngine *liquidity.DecisionEngine
}

// NewHybridRouter creates a new hybrid router
func NewHybridRouter(
	forecastUC *liquidity.ForecastUseCase,
	// ragClient *struct{}RagClient, // TODO: Package deleted in refactoring
	ragUseCase *ragUsecase.RagQueryUseCase,
	llmClient llm.LLMClient,
	decisionEngine *liquidity.DecisionEngine,
) *HybridRouter {
	return &HybridRouter{
		forecastUC: forecastUC,
		// ragClient:      ragClient, // TODO: Package deleted in refactoring
		ragUseCase:     ragUseCase,
		llmClient:      llmClient,
		decisionEngine: decisionEngine,
	}
}

// Route processes a question and routes it to the appropriate engine
func (r *HybridRouter) Route(ctx context.Context, input RouterInput) (*RouterOutput, error) {
	// Classify question
	routeType, confidence, reason := ClassifyQuestion(input.Question)

	// Log routing decision
	log.Info().
		Str("route", string(routeType)).
		Float64("confidence", confidence).
		Str("reason", reason).
		Str("question", input.Question).
		Msg("Question classified")

	// Route based on classification
	switch routeType {
	case RouteTypeForecast:
		return r.routeToForecast(ctx, input, confidence, reason)
	case RouteTypeRAG:
		return r.routeToRAG(ctx, input, confidence, reason)
	case RouteTypeHybrid:
		return r.routeToHybrid(ctx, input, confidence, reason)
	case RouteTypeAdvice:
		return r.routeToAdvice(ctx, input, confidence, reason)
	default:
		return r.routeToRAG(ctx, input, confidence, reason)
	}
}

// routeToForecast handles forecast-only queries
func (r *HybridRouter) routeToForecast(ctx context.Context, input RouterInput, confidence float64, reason string) (*RouterOutput, error) {
	if r.forecastUC == nil {
		return nil, fmt.Errorf("forecast use case not available")
	}

	log.Info().Str("tenant_id", input.TenantID.String()).Msg("Routing to forecast engine")

	// Generate forecast
	forecast, err := r.forecastUC.GenerateForecast(ctx, input.TenantID)
	if err != nil {
		return nil, fmt.Errorf("forecast generation failed: %w", err)
	}

	// Format forecast as natural language answer
	answer := r.formatForecastAnswer(forecast, input.Question)

	return &RouterOutput{
		Answer:    answer,
		Citations: []ragDomain.Citation{},
		Metadata: RouteMetadata{
			Route:      RouteTypeForecast,
			Confidence: confidence,
			Reason:     reason,
		},
	}, nil
}

// routeToRAG handles RAG-only queries
func (r *HybridRouter) routeToRAG(ctx context.Context, input RouterInput, confidence float64, reason string) (*RouterOutput, error) {
	log.Info().Str("tenant_id", input.TenantID.String()).Msg("Routing to RAG engine")

	// TODO: External RAG client disabled - package removed during refactoring
	// Try external RAG client first
	// if r.ragClient != nil {
	// 	resp, err := r.ragClient.Query(ctx, struct{}{
	// 		TenantID: input.TenantID.String(),
	// 		Question: input.Question,
	// 	})
	// 	if err == nil {
	// 		return &RouterOutput{
	// 			Answer:    resp.Answer,
	// 			Citations: nil,
	// 			Metadata: RouteMetadata{
	// 				Route:      RouteTypeRAG,
	// 				Confidence: confidence,
	// 				Reason:     reason,
	// 			},
	// 		}, nil
	// 	}
	// 	log.Warn().Err(err).Msg("External RAG client failed, falling back to embedded")
	// }

	// Fallback to embedded RAG
	if r.ragUseCase != nil {
		result, err := r.ragUseCase.Execute(ctx, ragUsecase.RagQueryInput{
			TenantID: input.TenantID,
			UserID:   input.UserID,
			Question: input.Question,
		})
		if err == nil {
			return &RouterOutput{
				Answer:    result.Answer,
				Citations: result.Citations,
				Metadata: RouteMetadata{
					Route:      RouteTypeRAG,
					Confidence: confidence,
					Reason:     reason,
				},
			}, nil
		}
		log.Error().Err(err).Msg("Embedded RAG failed")
	}

	// Final fallback
	return &RouterOutput{
		Answer:    "Unable to process query at this time.",
		Citations: []ragDomain.Citation{},
		Metadata: RouteMetadata{
			Route:      RouteTypeRAG,
			Confidence: 0.0,
			Reason:     "All RAG engines failed",
		},
	}, nil
}

// routeToHybrid handles hybrid queries (forecast + RAG + Claude synthesis)
func (r *HybridRouter) routeToHybrid(ctx context.Context, input RouterInput, confidence float64, reason string) (*RouterOutput, error) {
	log.Info().Str("tenant_id", input.TenantID.String()).Msg("Routing to hybrid engine")

	// 1. Get short forecast summary
	var forecastSummary string
	if r.forecastUC != nil {
		forecast, err := r.forecastUC.GenerateForecast(ctx, input.TenantID)
		if err != nil {
			log.Warn().Err(err).Msg("Forecast failed in hybrid route")
		} else {
			forecastSummary = r.formatForecastSummary(forecast)
		}
	}

	// 2. Get short RAG answer
	var ragAnswer string
	var citations []ragDomain.Citation

	// TODO: External RAG client disabled - package removed during refactoring
	// if r.ragClient != nil {
	// 	resp, err := r.ragClient.Query(ctx, struct{}{
	// 		TenantID: input.TenantID.String(),
	// 		Question: input.Question,
	// 	})
	// 	if err == nil {
	// 		ragAnswer = resp.Answer
	// 		citations = nil
	// 	} else {
	// 		log.Warn().Err(err).Msg("External RAG failed in hybrid route")
	// 	}
	// }

	// Fallback to embedded RAG if external failed
	if ragAnswer == "" && r.ragUseCase != nil {
		result, err := r.ragUseCase.Execute(ctx, ragUsecase.RagQueryInput{
			TenantID: input.TenantID,
			UserID:   input.UserID,
			Question: input.Question,
		})
		if err == nil {
			ragAnswer = result.Answer
			citations = result.Citations
		} else {
			log.Warn().Err(err).Msg("Embedded RAG failed in hybrid route")
		}
	}

	// 3. Synthesize with Claude
	if r.llmClient != nil && (forecastSummary != "" || ragAnswer != "") {
		synthesized, err := r.synthesizeWithClaude(ctx, input.Question, forecastSummary, ragAnswer)
		if err == nil {
			return &RouterOutput{
				Answer:    synthesized,
				Citations: citations,
				Metadata: RouteMetadata{
					Route:      RouteTypeHybrid,
					Confidence: confidence,
					Reason:     reason,
				},
			}, nil
		}
		log.Warn().Err(err).Msg("Claude synthesis failed, using deterministic fallback")
	}

	// 4. Deterministic fallback if Claude fails
	return r.deterministicHybridFallback(forecastSummary, ragAnswer, citations, confidence, reason), nil
}

// synthesizeWithClaude combines forecast and RAG answers using Claude
func (r *HybridRouter) synthesizeWithClaude(ctx context.Context, question, forecastSummary, ragAnswer string) (string, error) {
	prompt := buildHybridPrompt(question, forecastSummary, ragAnswer)

	resp, err := r.llmClient.Complete(ctx, llm.CompletionRequest{
		Messages: []llm.Message{
			{Role: "user", Content: prompt},
		},
		MaxTokens: 1024,
	})

	if err != nil {
		return "", err
	}

	return resp.Content, nil
}

// deterministicHybridFallback provides a deterministic combination when Claude fails
func (r *HybridRouter) deterministicHybridFallback(forecastSummary, ragAnswer string, citations []ragDomain.Citation, confidence float64, reason string) *RouterOutput {
	var parts []string

	if forecastSummary != "" {
		parts = append(parts, "Financial Forecast: "+forecastSummary)
	}

	if ragAnswer != "" {
		parts = append(parts, "Context: "+ragAnswer)
	}

	answer := strings.Join(parts, " ")
	if answer == "" {
		answer = "Unable to generate hybrid response at this time."
	}

	return &RouterOutput{
		Answer:    answer,
		Citations: citations,
		Metadata: RouteMetadata{
			Route:      RouteTypeHybrid,
			Confidence: confidence,
			Reason:     reason + " (deterministic fallback)",
		},
	}
}

// formatForecastAnswer formats forecast data as a natural language answer
func (r *HybridRouter) formatForecastAnswer(forecast *models.ForecastResult, question string) string {
	if forecast == nil || len(forecast.Forecast) == 0 {
		return "No forecast data available for this tenant."
	}

	currentCash := forecast.Metrics.CurrentCash
	week4 := forecast.Forecast[3].Baseline
	week13 := forecast.Forecast[12].Baseline

	return fmt.Sprintf(
		"Based on the 13-week cash forecast: Current cash position is SAR %.2f. "+
			"In 4 weeks, cash is projected to be SAR %.2f. "+
			"By week 13, cash is expected to reach SAR %.2f. "+
			"Forecast confidence: %.0f%%.",
		currentCash, week4, week13, forecast.Confidence*100,
	)
}

// formatForecastSummary creates a short forecast summary for hybrid synthesis
func (r *HybridRouter) formatForecastSummary(forecast *models.ForecastResult) string {
	if forecast == nil || len(forecast.Forecast) == 0 {
		return ""
	}

	currentCash := forecast.Metrics.CurrentCash
	week4 := forecast.Forecast[3].Baseline
	delta := week4 - currentCash

	direction := "increase"
	if delta < 0 {
		direction = "decrease"
	}

	return fmt.Sprintf(
		"Current cash: SAR %.2f. 4-week projection: SAR %.2f (%.2f%% %s). "+
			"Average daily inflow: SAR %.2f, outflow: SAR %.2f.",
		currentCash, week4, (delta/currentCash)*100, direction,
		forecast.Metrics.AvgDailyInflow, forecast.Metrics.AvgDailyOutflow,
	)
}

// buildHybridPrompt constructs the Claude prompt for hybrid synthesis
func buildHybridPrompt(question, forecastSummary, ragAnswer string) string {
	const template = `You are a treasury analyst for a GCC-based company.

The user asked: "%s"

Financial Forecast Data:
%s

Document Context:
%s

Instructions:
- Use the financial forecast to provide quantitative insights
- Use the document context to provide policy/regulatory context
- Combine both to give a comprehensive answer
- Be concise and actionable (2-3 sentences)
- Use SAR currency

Provide a clear, professional answer that addresses the user's question.`

	forecastSection := forecastSummary
	if forecastSection == "" {
		forecastSection = "No forecast data available."
	}

	ragSection := ragAnswer
	if ragSection == "" {
		ragSection = "No relevant document context found."
	}

	return fmt.Sprintf(template, question, forecastSection, ragSection)
}


// routeToAdvice handles advice/recommendation queries using Decision Engine
func (r *HybridRouter) routeToAdvice(ctx context.Context, input RouterInput, confidence float64, reason string) (*RouterOutput, error) {
	if r.decisionEngine == nil {
		log.Warn().Msg("Decision Engine not available, falling back to RAG")
		return r.routeToRAG(ctx, input, confidence, reason)
	}

	log.Info().Str("tenant_id", input.TenantID.String()).Msg("Routing to advice engine (Decision Engine)")

	// Get recommended actions from Decision Engine
	actions, err := r.decisionEngine.RecommendActions(ctx, input.TenantID)
	if err != nil {
		log.Error().Err(err).Msg("Decision Engine failed")
		return &RouterOutput{
			Answer:    "Unable to generate recommendations at this time.",
			Citations: []ragDomain.Citation{},
			Metadata: RouteMetadata{
				Route:      RouteTypeAdvice,
				Confidence: 0.0,
				Reason:     "Decision Engine failed",
			},
		}, nil
	}

	// If no actions, return helpful message
	if len(actions) == 0 {
		return &RouterOutput{
			Answer:    "Based on current treasury data, your cash position is healthy and no immediate actions are recommended.",
			Citations: []ragDomain.Citation{},
			Metadata: RouteMetadata{
				Route:      RouteTypeAdvice,
				Confidence: confidence,
				Reason:     reason + " (no actions needed)",
			},
		}, nil
	}

	// Synthesize natural language response with Claude
	if r.llmClient != nil {
		synthesized, err := r.synthesizeAdviceWithClaude(ctx, input.Question, actions)
		if err == nil {
			return &RouterOutput{
				Answer:    synthesized,
				Citations: []ragDomain.Citation{},
				Metadata: RouteMetadata{
					Route:      RouteTypeAdvice,
					Confidence: confidence,
					Reason:     reason,
				},
			}, nil
		}
		log.Warn().Err(err).Msg("Claude synthesis failed for advice, using deterministic fallback")
	}

	// Deterministic fallback if Claude fails
	return r.deterministicAdviceFallback(actions, confidence, reason), nil
}

// synthesizeAdviceWithClaude generates natural language advice using Claude
func (r *HybridRouter) synthesizeAdviceWithClaude(ctx context.Context, question string, actions []models.TreasuryAction) (string, error) {
	prompt := buildAdvicePrompt(question, actions)

	resp, err := r.llmClient.Complete(ctx, llm.CompletionRequest{
		Messages: []llm.Message{
			{Role: "user", Content: prompt},
		},
		MaxTokens: 1024,
	})

	if err != nil {
		return "", err
	}

	return resp.Content, nil
}

// deterministicAdviceFallback provides a deterministic response when Claude fails
func (r *HybridRouter) deterministicAdviceFallback(actions []models.TreasuryAction, confidence float64, reason string) *RouterOutput {
	var answer strings.Builder
	answer.WriteString("Based on current treasury data, here are the recommended actions:\n\n")

	for i, action := range actions {
		if i >= 5 {
			break // Max 5 actions
		}
		answer.WriteString(fmt.Sprintf("%d. %s: %s (Estimated impact: SAR %.0f, Confidence: %.0f%%)\n",
			i+1, action.Title, action.Description, action.Impact, action.Confidence*100))
	}

	return &RouterOutput{
		Answer:    answer.String(),
		Citations: []ragDomain.Citation{},
		Metadata: RouteMetadata{
			Route:      RouteTypeAdvice,
			Confidence: confidence,
			Reason:     reason + " (deterministic fallback)",
		},
	}
}

// buildAdvicePrompt constructs the Claude prompt for advice synthesis
func buildAdvicePrompt(question string, actions []models.TreasuryAction) string {
	const template = `You are a treasury AI advisor for a GCC-based company.

The user asked: "%s"

Based on analysis of their cash forecast and transaction data, the following financial actions are recommended:

%s

Instructions:
- Explain these recommendations in a clear, conversational tone
- Focus on the top 2-3 most impactful actions
- Explain WHY each action is recommended
- Be concise (3-4 sentences total)
- Use SAR currency
- Sound professional but approachable

Provide a helpful advisory response that addresses the user's question.`

	// Format actions for prompt
	var actionsList strings.Builder
	for i, action := range actions {
		if i >= 5 {
			break
		}
		actionsList.WriteString(fmt.Sprintf("%d. %s (%s)\n   - %s\n   - Estimated impact: SAR %.0f\n   - Confidence: %.0f%%\n\n",
			i+1, action.Title, action.Category, action.Description, action.Impact, action.Confidence*100))
	}

	return fmt.Sprintf(template, question, actionsList.String())
}

// parseUUID safely parses a UUID string
func parseUUID(s string) (uuid.UUID, error) {
	if s == "" {
		return uuid.UUID{}, fmt.Errorf("empty UUID string")
	}
	return uuid.Parse(s)
}
