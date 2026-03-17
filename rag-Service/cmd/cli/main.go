package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"tadfuq/rag-service/internal/config"
	"tadfuq/rag-service/internal/db"
	"tadfuq/rag-service/internal/embeddings"
	"tadfuq/rag-service/internal/llm"
	"tadfuq/rag-service/internal/models"
	"tadfuq/rag-service/internal/rag"
	"github.com/spf13/cobra"
)

var (
	pipeline *rag.Pipeline
	cfg      *config.Config
)

func main() {
	root := &cobra.Command{
		Use:   "rag-service",
		Short: "Financial RAG - AI-powered financial statement analysis",
		Long: `rag-service is a CLI tool for ingesting and querying financial documents
using Retrieval-Augmented Generation (RAG) with Claude AI.

Supported document types: PDF, DOCX, JPG, PNG`,
		PersistentPreRun: func(cmd *cobra.Command, args []string) {
			if cmd.Name() == "help" {
				return
			}
			initApp()
		},
	}

	root.AddCommand(
		serveCmd(),
		ingestCmd(),
		queryCmd(),
		listCmd(),
		extractCmd(),
		deleteCmd(),
	)

	if err := root.Execute(); err != nil {
		os.Exit(1)
	}
}

func initApp() {
	var err error
	cfg, err = config.Load()
	if err != nil {
		log.Fatalf("Config error: %v", err)
	}

	database, err := db.New(cfg.DSN())
	if err != nil {
		log.Fatalf("Database error: %v", err)
	}

	claudeClient := llm.New(cfg.AnthropicAPIKey)
	embedder := embeddings.New(cfg.VoyageAPIKey)

	pipeline = rag.New(database, embedder, claudeClient, rag.Config{
		TopK:         cfg.TopK,
		ChunkSize:    cfg.ChunkSize,
		ChunkOverlap: cfg.ChunkOverlap,
	})
}

// ----------------------------------------------------------------
// Commands
// ----------------------------------------------------------------

func serveCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "serve",
		Short: "Start the REST API server",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("Use 'go run ./cmd/api' to start the API server")
		},
	}
}

func ingestCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "ingest <file>",
		Short: "Ingest a financial document (PDF, DOCX, or image)",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			filePath := args[0]
			data, err := os.ReadFile(filePath)
			if err != nil {
				log.Fatalf("Reading file: %v", err)
			}

			ext := strings.ToLower(filepath.Ext(filePath))
			fileType := strings.TrimPrefix(ext, ".")
			if fileType == "jpg" {
				fileType = "jpeg"
			}

			fi, _ := os.Stat(filePath)
			req := &models.IngestRequest{
				DocumentID: uuid.New(),
				FileName:   filepath.Base(filePath),
				FileType:   fileType,
				FileSize:   fi.Size(),
				Data:       data,
			}

			fmt.Printf("Ingesting %s...\n", req.FileName)
			start := time.Now()
			ctx := context.Background()
			doc, err := pipeline.IngestDocument(ctx, req)
			if err != nil {
				log.Fatalf("Ingestion failed: %v", err)
			}

			fmt.Printf("OK Ingested successfully in %.1fs\n", time.Since(start).Seconds())
			fmt.Printf("  Document ID:  %s\n", doc.ID)
			fmt.Printf("  Name:         %s\n", doc.Name)
			fmt.Printf("  Type:         %s\n", doc.FileType)
			fmt.Printf("  Pages:        %d\n", doc.PageCount)
			fmt.Printf("  Size:         %d bytes\n", doc.FileSize)
		},
	}
}

func queryCmd() *cobra.Command {
	var sessionID string
	cmd := &cobra.Command{
		Use:   "query <question>",
		Short: "Ask a question about ingested financial documents",
		Args:  cobra.MinimumNArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			question := strings.Join(args, " ")
			req := &models.ChatRequest{Question: question}

			if sessionID != "" {
				id, err := uuid.Parse(sessionID)
				if err != nil {
					log.Fatalf("Invalid session ID: %v", err)
				}
				req.SessionID = &id
			}

			fmt.Printf("Question: %s\n\n", question)
			start := time.Now()
			resp, err := pipeline.Chat(context.Background(), req)
			if err != nil {
				log.Fatalf("Query failed: %v", err)
			}

			fmt.Printf("Answer:\n%s\n", resp.Answer)
			fmt.Printf("\n--- Sources (%d) | Time: %.1fs | Session: %s ---\n",
				len(resp.Sources), time.Since(start).Seconds(), resp.SessionID)
			for i, src := range resp.Sources {
				fmt.Printf("[%d] %s (page %d, %.1f%% match)\n",
					i+1, src.DocumentName, src.PageNumber, src.Similarity*100)
			}
		},
	}
	cmd.Flags().StringVarP(&sessionID, "session", "s", "", "Session ID for conversation continuity")
	return cmd
}

func listCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "list",
		Short: "List all ingested documents",
		Run: func(cmd *cobra.Command, args []string) {
			docs, err := pipeline.ListDocuments(context.Background())
			if err != nil {
				log.Fatalf("Failed to list documents: %v", err)
			}

			if len(docs) == 0 {
				fmt.Println("No documents ingested yet.")
				return
			}

			fmt.Printf("%-36s  %-40s  %-8s  %-6s  %s\n", "ID", "Name", "Type", "Pages", "Created At")
			fmt.Println(strings.Repeat("-", 110))
			for _, doc := range docs {
				fmt.Printf("%-36s  %-40s  %-8s  %-6d  %s\n",
					doc.ID, truncate(doc.Name, 40), doc.FileType, doc.PageCount,
					doc.CreatedAt.Format("2006-01-02 15:04"))
			}
			fmt.Printf("\nTotal: %d document(s)\n", len(docs))
		},
	}
}

func extractCmd() *cobra.Command {
	var outputFile string
	cmd := &cobra.Command{
		Use:   "extract <document-id>",
		Short: "Extract structured financial data from a document",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			id, err := uuid.Parse(args[0])
			if err != nil {
				log.Fatalf("Invalid document ID: %v", err)
			}

			fmt.Printf("Extracting structured data from document %s...\n", id)
			result, err := pipeline.ExtractStructured(context.Background(), id)
			if err != nil {
				log.Fatalf("Extraction failed: %v", err)
			}

			// Pretty print
			var output string
			if result.Data != nil {
				jsonBytes, _ := json.MarshalIndent(result.Data, "", "  ")
				output = string(jsonBytes)
			} else {
				output = result.RawText
			}

			if outputFile != "" {
				if err := os.WriteFile(outputFile, []byte(output), 0644); err != nil {
					log.Fatalf("Writing output: %v", err)
				}
				fmt.Printf("OK Results saved to %s\n", outputFile)
			} else {
				fmt.Printf("\nDocument: %s\n\n%s\n", result.DocumentName, output)
			}
		},
	}
	cmd.Flags().StringVarP(&outputFile, "output", "o", "", "Save JSON output to file")
	return cmd
}

func deleteCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "delete <document-id>",
		Short: "Delete a document and all its data",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			id, err := uuid.Parse(args[0])
			if err != nil {
				log.Fatalf("Invalid document ID: %v", err)
			}
			if err := pipeline.DeleteDocument(context.Background(), id); err != nil {
				log.Fatalf("Delete failed: %v", err)
			}
			fmt.Printf("OK Document %s deleted\n", id)
		},
	}
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n-3] + "..."
}
