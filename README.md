# Aster & Row commerce platform

A multi-page e-commerce storefront, customer portal, and administration workspace backed by a secure Node commerce API. Products support standard SKUs, apparel sizes, numbered footwear, grocery weights, packs, colors, and custom option combinations with inventory tracked per variant.

## Applications

- Storefront: React 19, TanStack Start/Router, Vite and TypeScript in `src/`.
- Commerce API: Express, Zod, JWT/RBAC, Prisma and PostgreSQL in `commerce-api/`.
- Local infrastructure: PostgreSQL and Redis in `docker-compose.yml`.

## Local development

Requirements: Node.js 22+, pnpm, and Docker for PostgreSQL.

1. Copy `.env.example` to `.env` and replace all secret placeholders.
2. Run `docker compose up -d postgres redis`.
3. In `commerce-api`, install packages, run `pnpm prisma migrate deploy`, then `pnpm dev`.
4. At the project root, install packages and run `pnpm dev`.
5. Open [http://localhost:5173](http://localhost:5173). The API health endpoint is [http://localhost:4000/health](http://localhost:4000/health).

The development-only administrator is `admin@asterrow.local` with password `ChangeMe!123`. It is never created in production; change it immediately if the development instance is exposed beyond localhost.

## Verification

- Storefront build: `pnpm build`
- API type/build check: `pnpm --dir commerce-api build`
- API tests: `pnpm --dir commerce-api test`
- Database schema: `pnpm --dir commerce-api prisma validate`

See `commerce-api/ARCHITECTURE.md` for security invariants and `commerce-api/DEPLOYMENT.md` for release, rollback, backup and provider setup guidance.
