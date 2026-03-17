package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	// ── Legacy RAG (existing endpoints — left untouched) ──────────
	legacyapi "tadfuq/rag-service/internal/api"
	"tadfuq/rag-service/internal/config"
	legacydb "tadfuq/rag-service/internal/db"
	"tadfuq/rag-service/internal/embeddings"
	"tadfuq/rag-service/internal/llm"
	legacyrag "tadfuq/rag-service/internal/rag"

	// ── Tadfuq RAG Phase 1 (tenant-scoped, clean arch) ───────────
	ragdomain "tadfuq/rag-service/internal/domain/rag"
	infradb "tadfuq/rag-service/internal/infrastructure/db"
	infraemb "tadfuq/rag-service/internal/infrastructure/embeddings"
	infrallm "tadfuq/rag-service/internal/infrastructure/llm"
	infraproc "tadfuq/rag-service/internal/infrastructure/processor"
	raghttp "tadfuq/rag-service/internal/interfaces/http/rag"

	// ── Tadfuq Insights Engine (deterministic, no LLM) ────────────
	insightsdomain "tadfuq/rag-service/internal/domain/insights"
	insightshttp "tadfuq/rag-service/internal/interfaces/http/insights"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	// ── Legacy RAG ───────────────────────────────────────────────
	legacyDatabase, err := legacydb.New(cfg.DSN())
	if err != nil {
		log.Fatalf("legacy db: %v", err)
	}
	defer legacyDatabase.Close()
	log.Println("✓ Legacy database connected")

	legacyClaude := llm.New(cfg.AnthropicAPIKey)
	legacyEmbedder := embeddings.New(cfg.VoyageAPIKey)

	legacyPipeline := legacyrag.New(legacyDatabase, legacyEmbedder, legacyClaude, legacyrag.Config{
		TopK:         cfg.TopK,
		ChunkSize:    cfg.ChunkSize,
		ChunkOverlap: cfg.ChunkOverlap,
	})

	// ── Tadfuq RAG Phase 1 ───────────────────────────────────────

	// Single RAGStore satisfies DocumentRepository + ChunkRepository + SessionRepository
	ragStore, err := infradb.NewRAGStore(cfg.DSN())
	if err != nil {
		log.Fatalf("tadfuq rag store: %v", err)
	}
	defer ragStore.Close()
	log.Println("✓ Tadfuq RAG store connected")

	// Initialize embedder based on configured provider
	ragEmbedder, err := infraemb.NewEmbedder(
		cfg.EmbeddingProvider,
		cfg.VoyageAPIKey,
		cfg.OpenAIAPIKey,
	)
	if err != nil {
		log.Fatalf("Failed to initialize embedder: %v", err)
	}
	log.Printf("✓ Embedding provider: %s", cfg.EmbeddingProvider)

	// Initialize LLM based on provider
	var ragLLM ragdomain.LLM
	llmProvider := os.Getenv("LLM_PROVIDER")
	if llmProvider == "openai" {
		openaiKey := os.Getenv("OPENAI_API_KEY")
		if openaiKey == "" {
			log.Fatal("OPENAI_API_KEY is required when LLM_PROVIDER=openai")
		}
		ragLLM = infrallm.NewOpenAILLM(openaiKey, "gpt-4o-mini", 2000)
		log.Println("✓ Using OpenAI GPT-4 for LLM")
	} else {
		ragLLM = infrallm.NewClaudeLLM(cfg.AnthropicAPIKey)
		log.Println("✓ Using Anthropic Claude for LLM")
	}

	ragParser := infraproc.NewDocumentParser(ragLLM)

	ragService := ragdomain.NewService(
		ragStore,    // domain.DocumentRepository
		ragStore,    // domain.ChunkRepository
		ragStore,    // domain.SessionRepository
		ragEmbedder, // domain.Embedder
		ragLLM,      // domain.LLM
		ragParser,   // domain.Parser
		ragdomain.ServiceConfig{
			ChunkSize:    cfg.ChunkSize,
			ChunkOverlap: cfg.ChunkOverlap,
			TopK:         cfg.TopK,
		},
	)
	log.Println("✓ Tadfuq RAG service initialised (Phase 1)")

	// ── HTTP Router ──────────────────────────────────────────────
	legacyHandler := legacyapi.NewHandler(legacyPipeline)
	router := legacyapi.SetupRouter(legacyHandler) // returns *gin.Engine

	// Mount Phase-1 RAG routes
	raghttp.RegisterRoutes(router, raghttp.NewHandler(ragService))

	// ── Insights Engine (deterministic — reuses same DB DSN, zero LLM) ───
	// InsightsStore is separate from RAGStore: no coupling between subsystems.
	insightsStore, err := infradb.NewInsightsStoreFromDSN(cfg.DSN())
	if err != nil {
		log.Fatalf("insights store: %v", err)
	}
	log.Println("✓ Insights Engine store connected")

	insightsService := insightsdomain.NewService(insightsStore)
	insightshttp.RegisterRoutes(router, insightshttp.NewHandler(insightsService))
	log.Println("✓ Insights Engine registered — GET /api/v1/tenants/:tenantId/insights")

	// ── Server ───────────────────────────────────────────────────
	addr := cfg.ServerHost + ":" + cfg.ServerPort
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  10 * time.Minute,
		WriteTimeout: 10 * time.Minute,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("🚀 Tadfuq Financial RAG API → http://%s", addr)
		log.Printf("   RAG:      POST /api/v1/tenants/:tenantId/rag/query")
		log.Printf("   Insights: GET  /api/v1/tenants/:tenantId/insights")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down…")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("force shutdown: %v", err)
	}
	log.Println("server exited")
}
