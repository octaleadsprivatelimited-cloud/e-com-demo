# Commerce API deployment

## Local verification

1. Copy `.env.example` to `.env` and replace every placeholder secret.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Apply checked-in migrations with `pnpm prisma migrate deploy`.
4. Start the API with `pnpm dev`; the health check is `GET /health`.
5. Run `pnpm test` and `pnpm build` before deployment.

The development catalog and `admin@asterrow.local` account exist only outside production. Production never creates a default administrator. Provision the first administrator with a one-time, audited bootstrap command after database creation.

## Production release

- Inject database, JWT, encryption and provider secrets from the hosting secret manager. Never commit `.env`.
- Use PostgreSQL TLS, a least-privilege application role, connection pooling, encrypted backups and point-in-time recovery.
- Run `prisma migrate deploy` as a release job before starting new application instances. Do not use `migrate dev` or `db push` in production.
- Terminate TLS at the load balancer, restrict CORS to exact storefront origins, and forward the real client IP only from trusted proxies.
- Configure provider webhook secrets before enabling an integration. Test invalid signatures, duplicate events, replays, delayed events, refunds, and shipping regressions.
- Replace development payment and shipping adapters with live provider adapters. The development adapters intentionally fail closed when `NODE_ENV=production`.
- Alert on elevated 5xx/429 rates, checkout failures, webhook backlog, stock conflicts, payment/order mismatches and notification failures.

## Rollback and recovery

Application rollback must remain compatible with the deployed database migration. Use expand/contract migrations for destructive changes. Keep daily encrypted snapshots and continuous WAL archiving, test restores monthly, and reconcile order totals, payments, refunds, shipments and inventory after recovery.
