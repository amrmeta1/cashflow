# Route53 records for backend services

# Get LoadBalancer hosted zone ID
data "aws_elb_hosted_zone_id" "main" {}

# Tenant Service DNS Record
resource "aws_route53_record" "tenant_service" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "tenant.${var.domain_name}"
  type    = "A"

  alias {
    name                   = data.kubernetes_service.tenant_service.status.0.load_balancer.0.ingress.0.hostname
    zone_id                = data.aws_elb_hosted_zone_id.main.id
    evaluate_target_health = true
  }

  depends_on = [aws_route53_zone.main]
}

# Ingestion Service DNS Record
resource "aws_route53_record" "ingestion_service" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "ingestion.${var.domain_name}"
  type    = "A"

  alias {
    name                   = data.kubernetes_service.ingestion_service.status.0.load_balancer.0.ingress.0.hostname
    zone_id                = data.aws_elb_hosted_zone_id.main.id
    evaluate_target_health = true
  }

  depends_on = [aws_route53_zone.main]
}

# ArgoCD DNS Record
resource "aws_route53_record" "argocd" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "argocd.${var.domain_name}"
  type    = "A"

  alias {
    name                   = data.kubernetes_service.argocd.status.0.load_balancer.0.ingress.0.hostname
    zone_id                = data.aws_elb_hosted_zone_id.main.id
    evaluate_target_health = true
  }

  depends_on = [aws_route53_zone.main]
}

# Data sources for Kubernetes services
data "kubernetes_service" "tenant_service" {
  metadata {
    name      = "tenant-service"
    namespace = "default"
  }
}

data "kubernetes_service" "ingestion_service" {
  metadata {
    name      = "ingestion-service"
    namespace = "default"
  }
}

data "kubernetes_service" "argocd" {
  metadata {
    name      = "argocd-server"
    namespace = "argocd"
  }
}

# Outputs
output "tenant_service_url" {
  description = "Tenant Service URL"
  value       = "https://tenant.${var.domain_name}"
}

output "ingestion_service_url" {
  description = "Ingestion Service URL"
  value       = "https://ingestion.${var.domain_name}"
}

output "argocd_url" {
  description = "ArgoCD URL"
  value       = "https://argocd.${var.domain_name}"
}
