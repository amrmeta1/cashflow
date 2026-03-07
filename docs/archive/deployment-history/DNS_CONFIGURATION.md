# 🌐 DNS Configuration - Cashflow Platform

**Date:** March 5, 2026  
**Domain:** api.tadfuq.ai  
**Hosted Zone ID:** Z05025173KCIQA1BDF937

---

## ✅ DNS Records Created

### **Backend Services**

#### **Tenant Service**
- **Domain:** `tenant.api.tadfuq.ai`
- **Type:** CNAME
- **Target:** `ab622b4c686614c8a81108dad6be427b-708827041.us-east-1.elb.amazonaws.com`
- **TTL:** 300 seconds
- **Status:** ✅ Active

**Test:**
```bash
curl http://tenant.api.tadfuq.ai/healthz
dig +short tenant.api.tadfuq.ai
```

#### **Ingestion Service**
- **Domain:** `ingestion.api.tadfuq.ai`
- **Type:** CNAME
- **Target:** `a9ea73ef0cb2b4a9b8d5e3b403a35522-993217501.us-east-1.elb.amazonaws.com`
- **TTL:** 300 seconds
- **Status:** ✅ Active

**Test:**
```bash
curl http://ingestion.api.tadfuq.ai/healthz
dig +short ingestion.api.tadfuq.ai
```

#### **ArgoCD**
- **Domain:** `argocd.api.tadfuq.ai`
- **Type:** CNAME
- **Target:** `a00ed7b5226fa4cfb8954fb38bb0bd8b-1858996676.us-east-1.elb.amazonaws.com`
- **TTL:** 300 seconds
- **Status:** ✅ Active & Redirecting to HTTPS

**Access:**
```bash
# HTTP redirects to HTTPS
http://argocd.api.tadfuq.ai
# Or use LoadBalancer directly
http://a00ed7b5226fa4cfb8954fb38bb0bd8b-1858996676.us-east-1.elb.amazonaws.com
```

---

## 📊 DNS Propagation Status

**Verification:**
```bash
# Check all DNS records
aws route53 list-resource-record-sets \
  --hosted-zone-id Z05025173KCIQA1BDF937 \
  --query "ResourceRecordSets[?contains(Name, 'api.tadfuq.ai')]"

# Test DNS resolution
dig tenant.api.tadfuq.ai
dig ingestion.api.tadfuq.ai
dig argocd.api.tadfuq.ai
```

**Results:**
- ✅ tenant.api.tadfuq.ai → 44.194.235.237, 34.224.1.27
- ✅ ingestion.api.tadfuq.ai → 52.201.12.127, 54.211.241.118
- ✅ argocd.api.tadfuq.ai → 100.25.5.210, 52.21.59.254

---

## 🔐 SSL/TLS Configuration

### **Current Status**
- **ACM Certificate:** Validated ✅
- **Domain:** `*.api.tadfuq.ai`
- **Validation:** DNS (CNAME record exists)

### **Next Steps for HTTPS**

#### **Option 1: AWS Certificate Manager (Recommended)**
Use ACM certificate with Application Load Balancer:

1. **Create ALB** (instead of Classic LB):
```yaml
# Update service type in Kubernetes manifests
apiVersion: v1
kind: Service
metadata:
  name: tenant-service
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:us-east-1:747253121951:certificate/xxx"
    service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "443"
spec:
  type: LoadBalancer
  ports:
  - port: 443
    targetPort: 8080
    protocol: TCP
```

2. **Update DNS** to point to new ALB

#### **Option 2: Ingress with AWS Load Balancer Controller**
Install and configure AWS Load Balancer Controller:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cashflow-ingress
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:747253121951:certificate/xxx
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
spec:
  rules:
  - host: tenant.api.tadfuq.ai
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: tenant-service
            port:
              number: 80
  - host: ingestion.api.tadfuq.ai
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ingestion-service
            port:
              number: 80
```

---

## 🔧 Managing DNS Records

### **Add New Service**
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z05025173KCIQA1BDF937 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "newservice.api.tadfuq.ai",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "your-loadbalancer.elb.amazonaws.com"}]
      }
    }]
  }'
```

### **Update Existing Record**
```bash
# Same command as above with "UPSERT" action
```

### **Delete Record**
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z05025173KCIQA1BDF937 \
  --change-batch '{
    "Changes": [{
      "Action": "DELETE",
      "ResourceRecordSet": {
        "Name": "oldservice.api.tadfuq.ai",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "old-loadbalancer.elb.amazonaws.com"}]
      }
    }]
  }'
```

---

## 📝 Service URLs Summary

### **Production URLs (with DNS)**
- **Tenant Service:** http://tenant.api.tadfuq.ai
- **Ingestion Service:** http://ingestion.api.tadfuq.ai
- **ArgoCD:** http://argocd.api.tadfuq.ai (redirects to HTTPS)

### **Direct LoadBalancer URLs (fallback)**
- **Tenant Service:** http://ab622b4c686614c8a81108dad6be427b-708827041.us-east-1.elb.amazonaws.com
- **Ingestion Service:** http://a9ea73ef0cb2b4a9b8d5e3b403a35522-993217501.us-east-1.elb.amazonaws.com
- **ArgoCD:** http://a00ed7b5226fa4cfb8954fb38bb0bd8b-1858996676.us-east-1.elb.amazonaws.com

---

## 🚀 Terraform Integration

DNS records can be managed via Terraform using the file:
`infra/terraform/route53_services.tf`

**Apply changes:**
```bash
cd infra/terraform
terraform plan
terraform apply
```

**Note:** The Terraform file requires Kubernetes provider configuration to read service LoadBalancer hostnames.

---

## 🔍 Troubleshooting

### **DNS Not Resolving**
```bash
# Check Route53 records
aws route53 list-resource-record-sets --hosted-zone-id Z05025173KCIQA1BDF937

# Test DNS from different servers
dig @8.8.8.8 tenant.api.tadfuq.ai
dig @1.1.1.1 tenant.api.tadfuq.ai

# Check TTL and wait for propagation (max 5 minutes)
```

### **Service Not Responding**
```bash
# Check LoadBalancer status
kubectl get svc

# Check pods
kubectl get pods

# Test LoadBalancer directly
curl http://[loadbalancer-dns]/healthz

# Check service endpoints
kubectl get endpoints tenant-service
```

### **SSL Certificate Issues**
```bash
# Verify ACM certificate
aws acm describe-certificate --certificate-arn [cert-arn]

# Check validation records
aws route53 list-resource-record-sets \
  --hosted-zone-id Z05025173KCIQA1BDF937 \
  --query "ResourceRecordSets[?Type=='CNAME' && contains(Name, '_')]"
```

---

## 📊 Monitoring

### **DNS Health Checks**
Consider adding Route53 health checks:

```bash
aws route53 create-health-check \
  --health-check-config \
    IPAddress=44.194.235.237,\
    Port=80,\
    Type=HTTP,\
    ResourcePath=/healthz
```

### **CloudWatch Alarms**
Monitor LoadBalancer metrics:
- Target response time
- Unhealthy host count
- Request count

---

**Last Updated:** March 5, 2026 10:43 PM UTC+3  
**Status:** ✅ All DNS records active and propagated
