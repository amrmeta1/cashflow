package ai

import (
	"github.com/go-chi/chi/v5"
)

// RouterDeps holds dependencies for the AI module router
type RouterDeps struct {
	RAGDocument interface{ RegisterRoutes(chi.Router) } // RAG document handler
	RAGQuery    interface{ RegisterRoutes(chi.Router) } // RAG query handler
}

// NewRouter creates a new router for the AI module
// Routes are mounted under /api/v1/ai
func NewRouter(deps RouterDeps) chi.Router {
	r := chi.NewRouter()

	// RAG query (conversational AI)
	if deps.RAGQuery != nil {
		r.Route("/query", func(r chi.Router) {
			deps.RAGQuery.RegisterRoutes(r)
		})
	}

	// RAG documents (upload, list, delete)
	if deps.RAGDocument != nil {
		r.Route("/documents", func(r chi.Router) {
			deps.RAGDocument.RegisterRoutes(r)
		})
	}

	// Future: Chat interface
	// r.Post("/chat", deps.Chat.Send)

	return r
}
