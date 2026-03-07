# AWS Cognito User Pool for Authentication

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}-users"

  # Password policy
  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  # User attributes
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = false
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  schema {
    name                = "tenant_id"
    attribute_data_type = "String"
    required            = false
    mutable             = true
  }

  # Auto-verified attributes
  auto_verified_attributes = ["email"]

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # MFA configuration
  mfa_configuration = "OPTIONAL"

  software_token_mfa_configuration {
    enabled = true
  }

  # User pool add-ons
  user_pool_add_ons {
    advanced_security_mode = "ENFORCED"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-user-pool"
  }
}

# User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}-auth"
  user_pool_id = aws_cognito_user_pool.main.id
}

# User Pool Client for Frontend
resource "aws_cognito_user_pool_client" "frontend" {
  name         = "${var.project_name}-${var.environment}-frontend"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = true

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  callback_urls = [
    "https://app.tadfuq.ai/api/auth/callback/cognito",
    "http://localhost:3000/api/auth/callback/cognito"
  ]

  logout_urls = [
    "https://app.tadfuq.ai",
    "http://localhost:3000"
  ]

  supported_identity_providers = ["COGNITO"]

  # Token validity
  access_token_validity  = 60  # minutes
  id_token_validity      = 60  # minutes
  refresh_token_validity = 30  # days

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # Read and write attributes
  read_attributes  = ["email", "name", "email_verified", "custom:tenant_id"]
  write_attributes = ["email", "name", "custom:tenant_id"]
}

# User Pool Client for Backend API (for service-to-service auth)
resource "aws_cognito_user_pool_client" "backend" {
  name         = "${var.project_name}-${var.environment}-backend"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = true

  # Backend uses client credentials flow
  # Note: client_credentials flow doesn't support email/profile scopes
  allowed_oauth_flows_user_pool_client = false
  
  # Token validity
  access_token_validity = 60 # minutes

  token_validity_units {
    access_token = "minutes"
  }
}

# Identity Pool for AWS service access (optional)
resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${var.project_name}-${var.environment}-identity"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.frontend.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = true
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-identity-pool"
  }
}

# IAM role for authenticated users
resource "aws_iam_role" "cognito_authenticated" {
  name = "${var.project_name}-${var.environment}-cognito-authenticated"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = "cognito-identity.amazonaws.com"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
        }
        "ForAnyValue:StringLike" = {
          "cognito-identity.amazonaws.com:amr" = "authenticated"
        }
      }
    }]
  })
}

# Attach role to identity pool
resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    authenticated = aws_iam_role.cognito_authenticated.arn
  }
}

# Note: Kubernetes secrets will be created manually after EKS cluster is ready
# This avoids circular dependency issues during terraform apply

# Output values for creating secrets later
output "cognito_secret_values" {
  description = "Cognito values for Kubernetes secret (use after EKS is ready)"
  value = {
    user_pool_id          = aws_cognito_user_pool.main.id
    client_id             = aws_cognito_user_pool_client.frontend.id
    client_secret         = aws_cognito_user_pool_client.frontend.client_secret
    issuer                = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
    domain                = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
    backend_client_id     = aws_cognito_user_pool_client.backend.id
    backend_client_secret = aws_cognito_user_pool_client.backend.client_secret
  }
  sensitive = true
}
