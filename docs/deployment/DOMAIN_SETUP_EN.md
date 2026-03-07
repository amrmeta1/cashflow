# Domain Name & SSL Setup Guide for AWS

## Overview

This guide explains how to connect a custom domain name to your Application Load Balancer and add an SSL certificate for HTTPS.

---

## Prerequisites

1. **Registered Domain Name** - You can purchase a domain from:
   - AWS Route53
   - GoDaddy
   - Namecheap
   - Any other provider

2. **Access to DNS Settings** for your domain

3. **AWS Account** with appropriate permissions

---

## Supported Scenarios

### Scenario 1: Domain Fully Managed in AWS Route53

If you want AWS to manage DNS completely:

```hcl
# In terraform.tfvars file
domain_name          = "api.cashflow.com"
create_hosted_zone   = true
create_api_subdomain = true
```

**Steps:**
1. Update `terraform.tfvars` with the values above
2. Run `terraform apply`
3. Copy the nameservers from output
4. Update nameservers at your domain registrar

### Scenario 2: Domain Managed Outside AWS

If you want to keep DNS at your current provider:

```hcl
# In terraform.tfvars file
domain_name          = "api.cashflow.com"
create_hosted_zone   = false
create_api_subdomain = false
```

**Steps:**
1. Update `terraform.tfvars` with the values above
2. Run `terraform apply`
3. SSL certificate will be created
4. **You must manually:**
   - Add CNAME records for certificate validation
   - Add A/CNAME record pointing to ALB DNS name

---

## Detailed Setup Steps

### 1. Update Terraform Configuration

```bash
cd infra/terraform

# Copy example file if you haven't already
cp terraform.tfvars.example terraform.tfvars

# Edit the file
nano terraform.tfvars
```

Add/modify these lines:

```hcl
# Domain Configuration
domain_name          = "api.cashflow.com"  # Replace with your domain
create_hosted_zone   = true                # true if you want AWS to manage DNS
create_api_subdomain = true                # Optional: create api.yourdomain.com
```

### 2. Apply Changes

```bash
# Preview changes
terraform plan

# Apply changes
terraform apply
```

**Note:** SSL certificate creation and validation may take 5-30 minutes.

### 3. Get Nameservers (if create_hosted_zone = true)

```bash
# Get nameservers
terraform output nameservers
```

You'll get something like:
```
[
  "ns-123.awsdns-12.com",
  "ns-456.awsdns-45.net",
  "ns-789.awsdns-78.org",
  "ns-012.awsdns-01.co.uk"
]
```

### 4. Update Nameservers at Domain Registrar

Go to your domain registrar's control panel (e.g., GoDaddy, Namecheap) and update nameservers to the values from the previous step.

**Example in GoDaddy:**
1. Log in to GoDaddy
2. Go to "My Products" → "Domains"
3. Click "DNS" next to your domain
4. Click "Change" next to Nameservers
5. Select "Custom" and enter AWS nameservers
6. Save changes

**⏱️ Propagation Time:** May take 24-48 hours for DNS changes to propagate globally.

---

## Verification

### 1. Verify DNS Propagation

```bash
# Check that domain points to ALB
dig api.cashflow.com

# Or use nslookup
nslookup api.cashflow.com
```

### 2. Verify SSL Certificate

```bash
# Check certificate status
aws acm describe-certificate \
  --certificate-arn $(terraform output -raw certificate_arn) \
  --region me-south-1
```

Should show `Status: "ISSUED"`

### 3. Test HTTPS

```bash
# Test connection
curl https://api.cashflow.com

# Test API endpoints
curl https://api.cashflow.com/api/tenant/healthz
curl https://api.cashflow.com/api/ingestion/healthz
```

---

## Manual Certificate Validation (if create_hosted_zone = false)

If you're not using Route53 to manage DNS, you must manually add CNAME records for validation:

### 1. Get validation records

```bash
# Get certificate ARN
terraform output certificate_arn

# Get validation records
aws acm describe-certificate \
  --certificate-arn <CERTIFICATE_ARN> \
  --region me-south-1 \
  --query 'Certificate.DomainValidationOptions[*].[ResourceRecord.Name,ResourceRecord.Value]' \
  --output table
```

### 2. Add CNAME records at DNS provider

In your DNS provider's control panel, add a CNAME record:

```
Name:  _abc123.api.cashflow.com
Value: _xyz456.acm-validations.aws.
TTL:   300
```

**Note:** You may need to add one or more records depending on domains/subdomains.

### 3. Add A/CNAME record for domain

```bash
# Get ALB DNS name
terraform output alb_dns_name
```

Add record in DNS:

**Option A - CNAME (preferred):**
```
Name:  api.cashflow.com
Type:  CNAME
Value: cashflow-dev-alb-1234567890.me-south-1.elb.amazonaws.com
TTL:   300
```

**Option B - A Record (if CNAME not supported):**
```
Name:  api.cashflow.com
Type:  A
Value: <IP address from ALB>
TTL:   300
```

---

## Troubleshooting

### Issue: Certificate validation stuck at "Pending Validation"

**Solution:**
1. Verify CNAME records were added correctly
2. Wait up to 30 minutes for DNS propagation
3. Check DNS records:
   ```bash
   dig _abc123.api.cashflow.com CNAME
   ```

### Issue: Domain doesn't resolve to ALB

**Solution:**
1. Check nameservers:
   ```bash
   dig api.cashflow.com NS
   ```
2. Ensure nameservers match AWS Route53 nameservers
3. Wait up to 48 hours for full DNS propagation

### Issue: HTTPS not working

**Solution:**
1. Verify certificate is issued:
   ```bash
   aws acm list-certificates --region me-south-1
   ```
2. Check ALB listener on port 443 exists:
   ```bash
   aws elbv2 describe-listeners \
     --load-balancer-arn $(terraform output -raw alb_arn) \
     --region me-south-1
   ```
3. Verify security group allows port 443

### Issue: "NET::ERR_CERT_COMMON_NAME_INVALID"

**Solution:**
- Ensure domain name in browser matches domain in certificate
- Verify certificate covers subdomain (wildcard)

---

## Security & Best Practices

### 1. Use HTTPS Only

After domain setup, enable redirect from HTTP to HTTPS (automatically enabled in Terraform).

### 2. Use TLS 1.3

SSL policy used: `ELBSecurityPolicy-TLS13-1-2-2021-06`

### 3. Auto-renew Certificate

ACM certificates auto-renew as long as validation records exist.

### 4. Use HSTS Headers

Add HSTS header in application code:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## Adding Additional Subdomains

To add a new subdomain (e.g., `app.cashflow.com`):

### 1. Add to certificate

```hcl
# In route53.tf
subject_alternative_names = [
  "*.${var.domain_name}",  # Wildcard covers all subdomains
]
```

### 2. Add Route53 record

```hcl
resource "aws_route53_record" "app" {
  count   = var.domain_name != "" && var.create_hosted_zone ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
```

---

## Cost

### Route53
- **Hosted Zone:** $0.50/month
- **DNS Queries:** $0.40 per million queries (first billion queries)

### ACM Certificate
- **FREE!** ✅ No cost for SSL certificates from ACM

### Total Additional Cost
- **~$0.50-1/month** (only Route53 hosted zone)

---

## Summary

After completing these steps, you'll have:

✅ Custom domain name pointing to ALB  
✅ Valid SSL certificate (HTTPS)  
✅ Automatic redirect from HTTP to HTTPS  
✅ DNS managed in Route53 (optional)  
✅ Wildcard certificate for all subdomains  

**Next Steps:**
- Update frontend configuration to use new domain
- Update CORS settings to accept new domain
- Update Keycloak redirect URIs
