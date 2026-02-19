-- CashFlow.ai: Tenant & Identity Foundation Schema
-- Multi-tenant SaaS with RBAC, audit logging

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TENANTS (Organizations)
-- ============================================================
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    plan        TEXT NOT NULL DEFAULT 'free',
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    metadata    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT NOT NULL UNIQUE,
    email_verified  BOOLEAN NOT NULL DEFAULT false,
    password_hash   TEXT, -- nullable: external IdP users won't have a local password
    full_name       TEXT NOT NULL DEFAULT '',
    avatar_url      TEXT NOT NULL DEFAULT '',
    idp_subject     TEXT, -- external IdP subject identifier (e.g. Keycloak sub)
    idp_issuer      TEXT, -- OIDC issuer URL
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'deleted')),
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_idp ON users(idp_issuer, idp_subject) WHERE idp_subject IS NOT NULL;
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- ROLES (per-tenant)
-- ============================================================
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_system   BOOLEAN NOT NULL DEFAULT false, -- system roles cannot be deleted
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_roles_tenant ON roles(tenant_id);

-- ============================================================
-- PERMISSIONS
-- ============================================================
CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource    TEXT NOT NULL,  -- e.g. 'tenant', 'user', 'role', 'invoice'
    action      TEXT NOT NULL,  -- e.g. 'create', 'read', 'update', 'delete', 'manage'
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(resource, action)
);

-- ============================================================
-- ROLE_PERMISSIONS (many-to-many)
-- ============================================================
CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================
-- MEMBERSHIPS (user <-> tenant, with role)
-- ============================================================
CREATE TABLE memberships (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_memberships_tenant ON memberships(tenant_id);
CREATE INDEX idx_memberships_user ON memberships(user_id);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID REFERENCES tenants(id) ON DELETE SET NULL,
    actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    action      TEXT NOT NULL, -- e.g. 'user.login', 'tenant.create', 'role.update'
    entity_type TEXT NOT NULL DEFAULT '', -- e.g. 'tenant', 'user', 'role'
    entity_id   TEXT NOT NULL DEFAULT '', -- UUID as text for flexibility
    metadata    JSONB NOT NULL DEFAULT '{}',
    ip_address  TEXT NOT NULL DEFAULT '',
    user_agent  TEXT NOT NULL DEFAULT '',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_occurred ON audit_logs(occurred_at);

-- ============================================================
-- SEED: Default permissions
-- ============================================================
INSERT INTO permissions (resource, action, description) VALUES
    ('tenant',     'create',  'Create tenants'),
    ('tenant',     'read',    'View tenant details'),
    ('tenant',     'update',  'Update tenant settings'),
    ('tenant',     'delete',  'Delete tenants'),
    ('user',       'create',  'Invite users'),
    ('user',       'read',    'View user profiles'),
    ('user',       'update',  'Update user profiles'),
    ('user',       'delete',  'Remove users'),
    ('role',       'create',  'Create roles'),
    ('role',       'read',    'View roles'),
    ('role',       'update',  'Update roles'),
    ('role',       'delete',  'Delete roles'),
    ('role',       'assign',  'Assign roles to users'),
    ('audit_log',  'read',    'View audit logs'),
    ('membership', 'manage',  'Manage memberships');
