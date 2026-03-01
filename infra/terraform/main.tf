# CashFlow.ai – Minimal Terraform Skeleton
# Intended for AWS deployment; extend per environment.

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state – uncomment and configure for production
  # backend "s3" {
  #   bucket         = "cashflow-terraform-state"
  #   key            = "tenant-service/terraform.tfstate"
  #   region         = "me-south-1"
  #   dynamodb_table = "cashflow-terraform-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
}

# ──────────────────────────────────────────────
# Variables
# ──────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region (GCC proximity)"
  type        = string
  default     = "me-south-1" # Bahrain – closest to Saudi/Qatar/UAE
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

# ──────────────────────────────────────────────
# VPC (placeholder – use a VPC module in production)
# ──────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "cashflow-${var.environment}"
    Environment = var.environment
    Project     = "cashflow"
  }
}

# ──────────────────────────────────────────────
# RDS PostgreSQL
# ──────────────────────────────────────────────

resource "aws_db_instance" "postgres" {
  identifier     = "cashflow-${var.environment}"
  engine         = "postgres"
  engine_version = "16.1"
  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true

  db_name  = "cashflow"
  username = "cashflow"
  # In production, use aws_secretsmanager_secret
  manage_master_user_password = true

  multi_az               = var.environment == "prod"
  backup_retention_period = var.environment == "prod" ? 7 : 1
  deletion_protection     = var.environment == "prod"

  skip_final_snapshot = var.environment != "prod"

  tags = {
    Name        = "cashflow-db-${var.environment}"
    Environment = var.environment
    Project     = "cashflow"
  }
}

# ──────────────────────────────────────────────
# ECR Repository
# ──────────────────────────────────────────────

resource "aws_ecr_repository" "tenant_service" {
  name                 = "cashflow/tenant-service"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
    Project     = "cashflow"
  }
}

# ──────────────────────────────────────────────
# Outputs
# ──────────────────────────────────────────────

output "db_endpoint" {
  value     = aws_db_instance.postgres.endpoint
  sensitive = true
}

output "ecr_repository_url" {
  value = aws_ecr_repository.tenant_service.repository_url
}
