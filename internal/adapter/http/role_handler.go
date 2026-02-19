package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/finch-co/cashflow/internal/domain"
)

type RoleHandler struct {
	roles       domain.RoleRepository
	permissions domain.PermissionRepository
	audit       domain.AuditLogRepository
}

func NewRoleHandler(roles domain.RoleRepository, permissions domain.PermissionRepository, audit domain.AuditLogRepository) *RoleHandler {
	return &RoleHandler{roles: roles, permissions: permissions, audit: audit}
}

func (h *RoleHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := domain.TenantIDFromContext(r.Context())
	if !ok {
		writeErrorResponse(w, domain.ErrTenantRequired)
		return
	}

	var input domain.CreateRoleInput
	if err := decodeJSON(r, &input); err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	role, err := h.roles.Create(r.Context(), tenantID, input)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	actorID, _ := domain.UserIDFromContext(r.Context())
	_ = h.audit.Create(r.Context(), domain.CreateAuditLogInput{
		TenantID:   &tenantID,
		ActorID:    &actorID,
		Action:     "role.create",
		EntityType: "role",
		EntityID:   role.ID.String(),
	})

	writeJSON(w, http.StatusCreated, role)
}

func (h *RoleHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "roleID"))
	if err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	role, err := h.roles.GetByID(r.Context(), id)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}
	writeJSON(w, http.StatusOK, role)
}

func (h *RoleHandler) ListByTenant(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := domain.TenantIDFromContext(r.Context())
	if !ok {
		writeErrorResponse(w, domain.ErrTenantRequired)
		return
	}

	roles, err := h.roles.ListByTenant(r.Context(), tenantID)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}
	writeJSON(w, http.StatusOK, roles)
}

func (h *RoleHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "roleID"))
	if err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	var input domain.UpdateRoleInput
	if err := decodeJSON(r, &input); err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	role, err := h.roles.Update(r.Context(), id, input)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	tenantID, _ := domain.TenantIDFromContext(r.Context())
	actorID, _ := domain.UserIDFromContext(r.Context())
	_ = h.audit.Create(r.Context(), domain.CreateAuditLogInput{
		TenantID:   &tenantID,
		ActorID:    &actorID,
		Action:     "role.update",
		EntityType: "role",
		EntityID:   id.String(),
	})

	writeJSON(w, http.StatusOK, role)
}

func (h *RoleHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "roleID"))
	if err != nil {
		writeErrorResponse(w, domain.ErrValidation)
		return
	}

	if err := h.roles.Delete(r.Context(), id); err != nil {
		writeErrorResponse(w, err)
		return
	}

	tenantID, _ := domain.TenantIDFromContext(r.Context())
	actorID, _ := domain.UserIDFromContext(r.Context())
	_ = h.audit.Create(r.Context(), domain.CreateAuditLogInput{
		TenantID:   &tenantID,
		ActorID:    &actorID,
		Action:     "role.delete",
		EntityType: "role",
		EntityID:   id.String(),
	})

	w.WriteHeader(http.StatusNoContent)
}

func (h *RoleHandler) ListPermissions(w http.ResponseWriter, r *http.Request) {
	perms, err := h.permissions.List(r.Context())
	if err != nil {
		writeErrorResponse(w, err)
		return
	}
	writeJSON(w, http.StatusOK, perms)
}
