package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"tadfuq/rag-service/internal/models"
	"tadfuq/rag-service/internal/rag"
)

// Handler holds the RAG pipeline and handles HTTP requests
type Handler struct {
	pipeline *rag.Pipeline
}

// NewHandler creates a new Handler
func NewHandler(pipeline *rag.Pipeline) *Handler {
	return &Handler{pipeline: pipeline}
}

// ----------------------------------------------------------------
// Documents
// ----------------------------------------------------------------

// IngestDocument handles POST /api/v1/documents
func (h *Handler) IngestDocument(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required: " + err.Error()})
		return
	}
	defer file.Close()

	// Validate file type
	ext := strings.ToLower(filepath.Ext(header.Filename))
	supportedTypes := map[string]bool{
		".pdf": true, ".docx": true,
		".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true,
	}
	if !supportedTypes[ext] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":           fmt.Sprintf("unsupported file type: %s", ext),
			"supported_types": []string{".pdf", ".docx", ".jpg", ".jpeg", ".png", ".gif", ".webp"},
		})
		return
	}

	// Read file data
	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "reading file: " + err.Error()})
		return
	}

	fileType := strings.TrimPrefix(ext, ".")
	if fileType == "jpg" {
		fileType = "jpeg"
	}

	req := &models.IngestRequest{
		DocumentID: uuid.New(),
		FileName:   header.Filename,
		FileType:   fileType,
		FileSize:   header.Size,
		Data:       data,
	}

	doc, err := h.pipeline.IngestDocument(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ingestion failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Document ingested successfully",
		"document": doc,
	})
}

// ListDocuments handles GET /api/v1/documents
func (h *Handler) ListDocuments(c *gin.Context) {
	docs, err := h.pipeline.ListDocuments(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"documents": docs, "count": len(docs)})
}

// DeleteDocument handles DELETE /api/v1/documents/:id
func (h *Handler) DeleteDocument(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid document ID"})
		return
	}
	if err := h.pipeline.DeleteDocument(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Document deleted successfully"})
}

// ----------------------------------------------------------------
// Chat
// ----------------------------------------------------------------

// Chat handles POST /api/v1/chat
func (h *Handler) Chat(c *gin.Context) {
	var req models.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.pipeline.Chat(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "chat failed: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// ----------------------------------------------------------------
// Extraction
// ----------------------------------------------------------------

// ExtractStructured handles POST /api/v1/documents/:id/extract
func (h *Handler) ExtractStructured(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid document ID"})
		return
	}

	result, err := h.pipeline.ExtractStructured(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Try to parse the JSON string
	var structured interface{}
	if err := json.Unmarshal([]byte(result.RawText), &structured); err == nil {
		result.Data = structured.(map[string]interface{})
		result.RawText = ""
	}

	c.JSON(http.StatusOK, result)
}

// HealthCheck handles GET /health
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "rag-service"})
}
