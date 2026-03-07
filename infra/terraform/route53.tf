# Route53 DNS Configuration

# Data source for existing hosted zone
data "aws_route53_zone" "existing" {
  count   = var.existing_hosted_zone_id != "" ? 1 : 0
  zone_id = var.existing_hosted_zone_id
}

# Create new hosted zone if needed
resource "aws_route53_zone" "main" {
  count = var.create_hosted_zone && var.domain_name != "" ? 1 : 0
  name  = var.domain_name

  tags = {
    Name = "${var.project_name}-${var.environment}-zone"
  }
}

# ACM Certificate for domain
resource "aws_acm_certificate" "main" {
  count             = var.domain_name != "" ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-cert"
  }
}

# DNS validation records
resource "aws_route53_record" "cert_validation" {
  for_each = var.domain_name != "" ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.create_hosted_zone ? aws_route53_zone.main[0].zone_id : var.existing_hosted_zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "main" {
  count                   = var.domain_name != "" ? 1 : 0
  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Note: ALB DNS records will be created by Kubernetes Ingress Controller
# The Ingress will automatically create an ALB and Route53 records
# You can manually add A records pointing to the ALB after deployment if needed
