# Multi-Tenant SaaS Platform

This is a production-ready multi-tenant SaaS platform built with an Azure architecture in mind.

## Tech Stack
- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS, Shadcn UI, React Query
- **Backend**: NestJS, Node.js, REST API, Swagger
- **Database**: PostgreSQL (via Azure DB)
- **Infrastructure**: Docker for local dev (Redis & Postgres)

## Directory Structure
- `/apps/web` - Next.js frontend application
- `/apps/api` - NestJS backend application
- `docker-compose.yml` - Local database and caching services

## Getting Started

1. **Start dependencies**:
   ```bash
   docker-compose up -d
   ```

2. **Run Backend**:
   ```bash
   cd apps/api
   npm run start:dev
   ```

3. **Run Frontend**:
   ```bash
   cd apps/web
   npm run dev
   ```
