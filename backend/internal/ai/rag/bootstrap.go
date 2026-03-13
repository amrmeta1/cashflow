package rag

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"

	llm "github.com/finch-co/cashflow/internal/ai/claude"
	"github.com/finch-co/cashflow/internal/ai/rag/embeddings"
	http "github.com/finch-co/cashflow/internal/ai/rag/handlers"
	parser "github.com/finch-co/cashflow/internal/ai/rag/parsers"
	db "github.com/finch-co/cashflow/internal/ai/rag/repositories"
	"github.com/finch-co/cashflow/internal/ai/rag/storage"
	"github.com/finch-co/cashflow/internal/ai/rag/usecase"

	// "github.com/finch-co/cashflow/internal/ai/ragclient" // TODO: Package deleted in refactoring
	"github.com/finch-co/cashflow/internal/ai/router"
	forecastUC "github.com/finch-co/cashflow/internal/liquidity"
)

// Bootstrap contains the initialized RAG HTTP handlers ready for registration
type Bootstrap struct {
	DocumentHandler *http.DocumentHandler
	RagHandler      *http.RagHandler
}

// NewBootstrap initializes all RAG dependencies and returns handlers
func NewBootstrap(pool *pgxpool.Pool, voyageAPIKey, claudeAPIKey, ragServiceURL string, forecastUseCase *forecastUC.ForecastUseCase, decisionEngine *forecastUC.DecisionEngine) *Bootstrap {
	// Initialize repositories
	documentRepo := db.NewDocumentRepo(pool)
	chunkRepo := db.NewChunkRepo(pool)
	queryRepo := db.NewQueryRepo(pool)

	// Initialize file storage
	fileStorage := storage.NewLocalFileStorage("./storage/documents")

	// Initialize parsers
	pdfParser := parser.NewPDFParser()
	docxParser := parser.NewDOCXParser()
	textParser := parser.NewTextParser()

	// Initialize text chunker (500-800 tokens, 50-80 overlap)
	chunker, err := usecase.NewTokenBasedChunker(500, 800, 50, 80)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize text chunker")
		panic(err)
	}

	// Initialize embeddings client
	var embeddingsClient embeddings.EmbeddingsClient
	if voyageAPIKey != "" {
		embeddingsClient = embeddings.NewVoyageClient(voyageAPIKey)
		log.Info().Msg("Voyage AI embeddings client initialized")
	} else {
		log.Warn().Msg("VOYAGE_API_KEY not provided, embeddings will be skipped")
	}

	// Initialize embedding use case
	var embeddingUseCase *usecase.EmbedChunksUseCase
	if embeddingsClient != nil {
		embeddingUseCase = usecase.NewEmbedChunksUseCase(chunkRepo, embeddingsClient)
	}

	// Initialize Claude client
	var llmClient llm.LLMClient
	if claudeAPIKey != "" {
		llmClient = llm.NewClaudeClient(claudeAPIKey)
		log.Info().Msg("Claude AI client initialized")
	} else {
		log.Warn().Msg("ANTHROPIC_API_KEY not provided, RAG queries will fail")
	}

	// Initialize search use case (keep reference for RAG)
	var searchUseCase *usecase.SearchChunksUseCase
	if embeddingsClient != nil {
		searchUseCase = usecase.NewSearchChunksUseCase(chunkRepo, embeddingsClient)
		log.Info().Msg("Semantic search use case initialized")
	}

	// TODO: RAG client disabled - package deleted in refactoring
	// Initialize RAG client for external service
	// var ragClient *ragclient.RagClient
	// if ragServiceURL != "" {
	// 	ragClient = ragclient.NewRagClient(ragServiceURL)
	// 	log.Info().Str("url", ragServiceURL).Msg("External RAG service client initialized")
	// }

	// Initialize use cases (note: chunkUseCase must be created before ingestUseCase)
	chunkUseCase := usecase.NewChunkDocumentUseCase(
		documentRepo,
		chunkRepo,
		fileStorage,
		pdfParser,
		docxParser,
		textParser,
		chunker,
		embeddingUseCase,
	)

	ingestUseCase := usecase.NewIngestDocumentUseCase(
		documentRepo,
		fileStorage,
		chunkUseCase,
	)

	// Initialize RAG query use case with dependencies
	var ragQueryUseCase *usecase.RagQueryUseCase
	// TODO: External RAG client removed
	// if ragClient != nil {
	// 	// Use external RAG service
	// 	ragQueryUseCase = usecase.NewRagQueryUseCase(chunkRepo, queryRepo, nil, nil, ragClient)
	// 	log.Info().Msg("RAG query use case initialized with external service")
	// } else
	if searchUseCase != nil && llmClient != nil {
		// Use embedded implementation
		ragQueryUseCase = usecase.NewRagQueryUseCase(chunkRepo, queryRepo, searchUseCase, llmClient)
		log.Info().Msg("RAG query use case initialized with embedded implementation")
	} else {
		// Fallback without dependencies (will fail on query)
		ragQueryUseCase = usecase.NewRagQueryUseCase(chunkRepo, queryRepo, nil, nil)
		log.Warn().Msg("RAG query use case initialized without search/LLM (queries will fail)")
	}

	// Initialize hybrid router
	var hybridRouter *router.HybridRouter
	if forecastUseCase != nil {
		hybridRouter = router.NewHybridRouter(
			forecastUseCase,
			// ragClient, // TODO: Package deleted in refactoring
			ragQueryUseCase,
			llmClient,
			decisionEngine,
		)
		log.Info().Msg("Hybrid AI router initialized with Decision Engine")
	}

	// Initialize HTTP handlers
	documentHandler := http.NewDocumentHandler(documentRepo, ingestUseCase, chunkUseCase, embeddingUseCase)
	ragHandler := http.NewRagHandler(queryRepo, ragQueryUseCase, hybridRouter)

	return &Bootstrap{
		DocumentHandler: documentHandler,
		RagHandler:      ragHandler,
	}
}
