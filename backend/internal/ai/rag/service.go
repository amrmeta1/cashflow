package rag

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"

	llm "github.com/finch-co/cashflow/internal/ai/claude"
	"github.com/finch-co/cashflow/internal/ai/rag/domain"
	"github.com/finch-co/cashflow/internal/ai/rag/embeddings"
	http "github.com/finch-co/cashflow/internal/ai/rag/handlers"
	parser "github.com/finch-co/cashflow/internal/ai/rag/parsers"
	db "github.com/finch-co/cashflow/internal/ai/rag/repositories"
	"github.com/finch-co/cashflow/internal/ai/rag/storage"
	"github.com/finch-co/cashflow/internal/ai/rag/usecase"
)

// Service represents the RAG service with all dependencies
type Service struct {
	// Repositories
	DocumentRepo domain.DocumentRepository
	ChunkRepo    domain.ChunkRepository
	QueryRepo    domain.QueryRepository

	// Use Cases
	IngestUseCase    *usecase.IngestDocumentUseCase
	ChunkUseCase     *usecase.ChunkDocumentUseCase
	EmbeddingUseCase *usecase.EmbedChunksUseCase
	RagQueryUseCase  *usecase.RagQueryUseCase

	// HTTP Handlers
	DocumentHandler *http.DocumentHandler
	RagHandler      *http.RagHandler

	// External Adapters (stubs)
	EmbeddingsClient embeddings.EmbeddingsClient
	LLMClient        llm.LLMClient
	PDFParser        parser.PDFParser
	DOCXParser       parser.DOCXParser
	TextParser       parser.TextParser
}

// NewService creates a new RAG service with all dependencies wired
func NewService(pool *pgxpool.Pool, openaiAPIKey string) *Service {
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
	if openaiAPIKey != "" {
		embeddingsClient = embeddings.NewOpenAIEmbeddingsClient(openaiAPIKey, "text-embedding-ada-002")
	}

	// Initialize embedding use case
	var embeddingUseCase *usecase.EmbedChunksUseCase
	if embeddingsClient != nil {
		embeddingUseCase = usecase.NewEmbedChunksUseCase(chunkRepo, embeddingsClient)
	}

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

	// Initialize search use case
	var searchUseCase *usecase.SearchChunksUseCase
	if embeddingsClient != nil {
		searchUseCase = usecase.NewSearchChunksUseCase(chunkRepo, embeddingsClient)
	}

	// Initialize LLM client (stub)
	var llmClient llm.LLMClient
	if openaiAPIKey != "" {
		llmClient = llm.NewOpenAILLMClient(openaiAPIKey, "gpt-4")
	}

	// Initialize RAG query use case
	var ragQueryUseCase *usecase.RagQueryUseCase
	if searchUseCase != nil && llmClient != nil {
		ragQueryUseCase = usecase.NewRagQueryUseCase(chunkRepo, queryRepo, searchUseCase, llmClient)
	} else {
		ragQueryUseCase = usecase.NewRagQueryUseCase(chunkRepo, queryRepo, nil, nil)
	}

	// Initialize HTTP handlers
	documentHandler := http.NewDocumentHandler(documentRepo, ingestUseCase, chunkUseCase, embeddingUseCase)
	ragHandler := http.NewRagHandler(queryRepo, ragQueryUseCase, nil)

	return &Service{
		DocumentRepo:     documentRepo,
		ChunkRepo:        chunkRepo,
		QueryRepo:        queryRepo,
		IngestUseCase:    ingestUseCase,
		ChunkUseCase:     chunkUseCase,
		EmbeddingUseCase: embeddingUseCase,
		RagQueryUseCase:  ragQueryUseCase,
		DocumentHandler:  documentHandler,
		RagHandler:       ragHandler,
		EmbeddingsClient: embeddingsClient,
		LLMClient:        llmClient,
		PDFParser:        pdfParser,
		DOCXParser:       docxParser,
		TextParser:       textParser,
	}
}
