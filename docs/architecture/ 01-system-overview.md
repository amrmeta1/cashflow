# System Overview

Tadfuq.ai is a multi-tenant treasury intelligence platform designed for GCC enterprises.

## Core Components

- Frontend (Next.js)
- Backend Services (Go)
- PostgreSQL Database
- Deterministic Forecast Engine
- Rules Engine
- Optional LLM Explanation Layer
- Multi-tenant Access Control

## High-Level Architecture

User → Frontend → API Gateway → Services → Database
                                     → Rules Engine
                                     → Forecast Engine
                                     → LLM Layer (optional)

## Design Principles

- Deterministic financial core
- AI used only for explanation, never calculations
- Strict tenant isolation
- Enterprise-grade security