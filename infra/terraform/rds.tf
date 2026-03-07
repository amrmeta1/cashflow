# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name        = "${var.project_name}-${var.environment}-db-subnet"
    Environment = var.environment
    Project     = var.project_name
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier     = "${var.project_name}-${var.environment}"
  engine         = "postgres"
  engine_version = "16.13"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = 100
  storage_encrypted     = true
  storage_type          = "gp3"

  db_name  = "cashflow"
  username = "cashflow"
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Dev/Staging: Single-AZ, minimal backups
  multi_az               = false
  backup_retention_period = 1
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"
  
  deletion_protection = false
  skip_final_snapshot = true
  
  # Performance Insights for monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  # Auto minor version upgrades
  auto_minor_version_upgrade = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-db"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Store DB password in Secrets Manager
data "aws_secretsmanager_secret" "db_password" {
  arn = aws_db_instance.postgres.master_user_secret[0].secret_arn
}

data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = data.aws_secretsmanager_secret.db_password.id
}
