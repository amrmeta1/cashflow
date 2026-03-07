# Outputs for CashFlow.ai Infrastructure

# VPC Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

# EKS Outputs
output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "eks_cluster_arn" {
  description = "EKS cluster ARN"
  value       = aws_eks_cluster.main.arn
}

output "eks_cluster_certificate_authority" {
  description = "EKS cluster certificate authority data"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "eks_oidc_provider_arn" {
  description = "ARN of the OIDC Provider for EKS"
  value       = aws_iam_openid_connect_provider.eks.arn
}

output "alb_controller_role_arn" {
  description = "IAM role ARN for AWS Load Balancer Controller"
  value       = aws_iam_role.aws_load_balancer_controller.arn
}

# ECR Outputs
output "ecr_tenant_service_url" {
  description = "ECR repository URL for tenant service"
  value       = aws_ecr_repository.tenant_service.repository_url
}

output "ecr_ingestion_service_url" {
  description = "ECR repository URL for ingestion service"
  value       = aws_ecr_repository.ingestion_service.repository_url
}

output "ecr_frontend_url" {
  description = "ECR repository URL for frontend"
  value       = aws_ecr_repository.frontend.repository_url
}

# Database Outputs
output "db_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "db_password_secret_arn" {
  description = "ARN of the secret containing DB password"
  value       = aws_db_instance.postgres.master_user_secret[0].secret_arn
  sensitive   = true
}

# Cognito Outputs
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.main.arn
}

output "cognito_user_pool_endpoint" {
  description = "Cognito User Pool endpoint"
  value       = aws_cognito_user_pool.main.endpoint
}

output "cognito_domain" {
  description = "Cognito domain"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "cognito_client_id" {
  description = "Cognito frontend client ID"
  value       = aws_cognito_user_pool_client.frontend.id
}

output "cognito_client_secret" {
  description = "Cognito frontend client secret"
  value       = aws_cognito_user_pool_client.frontend.client_secret
  sensitive   = true
}

# Domain Outputs
output "domain_name" {
  description = "Domain name"
  value       = var.domain_name
}

output "hosted_zone_id" {
  description = "Route53 hosted zone ID"
  value       = var.domain_name != "" ? (var.create_hosted_zone ? aws_route53_zone.main[0].zone_id : var.existing_hosted_zone_id) : ""
}

output "nameservers" {
  description = "Route53 nameservers (if zone was created)"
  value       = var.create_hosted_zone && var.domain_name != "" ? aws_route53_zone.main[0].name_servers : []
}

output "certificate_arn" {
  description = "ACM certificate ARN"
  value       = var.domain_name != "" ? aws_acm_certificate.main[0].arn : ""
  sensitive   = true
}
