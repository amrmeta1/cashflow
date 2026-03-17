package router

import (
	"strings"
)

var (
	forecastKeywords = []string{
		"forecast", "cash next", "runway", "liquidity next", "projection",
		"next week", "next month", "next quarter", "next year",
		"will cash", "expected cash", "cash position next",
		"future cash", "upcoming", "projected", "anticipate",
	}

	ragKeywords = []string{
		"policy", "document", "contract", "agreement", "terms",
		"regulation", "compliance", "procedure", "guideline",
		"what does the", "according to", "in the document",
		"show me the", "find in", "search for",
	}

	reasoningKeywords = []string{
		"why", "explain", "reason", "cause", "because",
		"what causes", "what drives", "what leads to",
		"how come", "what makes",
	}

	adviceKeywords = []string{
		"should we", "what should we do", "recommend", "recommendation",
		"how can we improve cash", "how to fix cash", "cash strategy",
		"improve liquidity", "reduce burn", "what can we do",
		"advice", "suggest", "help us", "what actions",
		"how do we", "best way to", "optimize cash",
		"improve cash flow", "fix liquidity", "reduce costs",
	}
)

// ClassifyQuestion analyzes a question and determines the appropriate route
func ClassifyQuestion(question string) (RouteType, float64, string) {
	lower := strings.ToLower(question)

	hasForecast := containsAny(lower, forecastKeywords)
	hasRAG := containsAny(lower, ragKeywords)
	hasReasoning := containsAny(lower, reasoningKeywords)
	hasAdvice := containsAny(lower, adviceKeywords)

	// Advice: user asking for recommendations
	if hasAdvice {
		confidence := 0.9
		reason := "Question contains advice/recommendation keywords"
		return RouteTypeAdvice, confidence, reason
	}

	// Hybrid: forecast + reasoning or forecast + RAG
	if hasForecast && (hasRAG || hasReasoning) {
		confidence := 0.85
		reason := "Question contains forecast indicators with reasoning/context keywords"
		return RouteTypeHybrid, confidence, reason
	}

	// Pure forecast
	if hasForecast {
		confidence := 0.9
		reason := "Question contains forecast-related keywords"
		return RouteTypeForecast, confidence, reason
	}

	// Pure RAG
	if hasRAG {
		confidence := 0.9
		reason := "Question contains document/policy-related keywords"
		return RouteTypeRAG, confidence, reason
	}

	// Default to RAG for general questions
	confidence := 0.6
	reason := "Default route for general questions"
	return RouteTypeRAG, confidence, reason
}

// containsAny checks if the text contains any of the keywords
func containsAny(text string, keywords []string) bool {
	for _, keyword := range keywords {
		if strings.Contains(text, keyword) {
			return true
		}
	}
	return false
}
