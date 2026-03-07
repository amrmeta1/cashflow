# CashFlow.ai – AWS Infrastructure for Dev/Staging
# Complete ECS Fargate deployment with RDS, ALB, and VPC

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
  #   key            = "dev/terraform.tfstate"
  #   region         = "me-south-1"
  #   dynamodb_table = "cashflow-terraform-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
