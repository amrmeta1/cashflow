# Deployment Architecture

## Environment

- Frontend: Vercel
- Backend: Docker (VPS / ECS)
- Database: PostgreSQL (Managed)
- Backups: Daily pg_dump → S3
- Monitoring: Sentry + UptimeRobot

## Environments

- Local
- Staging
- Production

## Zero Downtime Strategy

- Blue/Green deployment (future)
- Database migrations backward compatible