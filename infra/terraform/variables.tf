variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "cashflow"
}

# Database
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Initial database storage in GB"
  type        = number
  default     = 20
}

# EKS
variable "eks_instance_type" {
  description = "EC2 instance type for EKS nodes"
  type        = string
  default     = "t3.medium"
}

variable "eks_desired_nodes" {
  description = "Desired number of EKS nodes"
  type        = number
  default     = 2
}

variable "eks_min_nodes" {
  description = "Minimum number of EKS nodes"
  type        = number
  default     = 1
}

variable "eks_max_nodes" {
  description = "Maximum number of EKS nodes"
  type        = number
  default     = 4
}

# Networking
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# Domain & DNS
variable "domain_name" {
  description = "Domain name for the application (e.g., api.tadfuq.ai or tadfuq.ai). Leave empty to skip domain setup."
  type        = string
  default     = ""
}

variable "existing_hosted_zone_id" {
  description = "Existing Route53 hosted zone ID (e.g., Z05025173KCIQA1BDF937). Use this if domain already exists in Route53."
  type        = string
  default     = ""
}

variable "create_hosted_zone" {
  description = "Whether to create a NEW Route53 hosted zone. Set to false if using existing_hosted_zone_id."
  type        = bool
  default     = false
}

variable "create_api_subdomain" {
  description = "Whether to create api.domain.com subdomain pointing to ALB (only if domain_name is root domain)"
  type        = bool
  default     = false
}
