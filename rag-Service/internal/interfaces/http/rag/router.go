package rag

import "github.com/gin-gonic/gin"

// RegisterRoutes mounts all Phase-1 RAG routes under the standard
// Tadfuq path prefix: /api/v1/tenants/:tenantId/rag/...
//
// Routes registered:
//
//	POST   /api/v1/tenants/:tenantId/rag/documents          → UploadDocument
//	GET    /api/v1/tenants/:tenantId/rag/documents          → ListDocuments
//	DELETE /api/v1/tenants/:tenantId/rag/documents/:docId   → DeleteDocument
//	POST   /api/v1/tenants/:tenantId/rag/query              → Query
func RegisterRoutes(r *gin.Engine, h *Handler) {
	tenant := r.Group("/api/v1/tenants/:tenantId/rag")
	{
		docs := tenant.Group("/documents")
		{
			docs.POST("", h.UploadDocument)
			docs.GET("", h.ListDocuments)
			docs.DELETE("/:docId", h.DeleteDocument)
		}

		tenant.POST("/query", h.Query)
	}
}
