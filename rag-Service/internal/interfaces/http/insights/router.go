package insights

import "github.com/gin-gonic/gin"

// RegisterRoutes mounts the Insights Engine endpoint on the Gin router.
//
// Route registered:
//
//	GET /api/v1/tenants/:tenantId/insights → GetInsights
func RegisterRoutes(r *gin.Engine, h *Handler) {
	r.GET("/api/v1/tenants/:tenantId/insights", h.GetInsights)
}
