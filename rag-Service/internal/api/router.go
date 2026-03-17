package api

import (
	"github.com/gin-gonic/gin"
)

// SetupRouter creates and configures the Gin router
func SetupRouter(handler *Handler) *gin.Engine {
	r := gin.Default()

	// Health check
	r.GET("/health", handler.HealthCheck)

	v1 := r.Group("/api/v1")
	{
		// Documents
		docs := v1.Group("/documents")
		{
			docs.POST("", handler.IngestDocument)
			docs.GET("", handler.ListDocuments)
			docs.DELETE("/:id", handler.DeleteDocument)
			docs.POST("/:id/extract", handler.ExtractStructured)
		}

		// Chat
		v1.POST("/chat", handler.Chat)
	}

	return r
}
