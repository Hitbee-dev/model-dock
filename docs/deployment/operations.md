# Operations Runbook

This runbook covers backup, restore, update, rollback, monitoring, and hardening tasks for ModelDock operators.

## Backup

Back up before upgrades and before destructive migrations.

```bash
docker compose exec postgres pg_dump -U modeldock modeldock > modeldock-postgres.sql
docker compose exec redis redis-cli --rdb /data/modeldock-redis.rdb
```

Also back up object storage buckets and Weaviate volumes using the storage provider's native snapshot tools. Keep backups encrypted and outside the app host.

## Restore

Restore into a new environment first.

```bash
docker compose down
docker compose up -d postgres redis objectstore weaviate
docker compose exec -T postgres psql -U modeldock modeldock < modeldock-postgres.sql
docker compose up -d
```

After restore, verify `/healthz`, login, admin access, LiteLLM connectivity, and a non-sensitive test chat.

## Update

```bash
git pull --ff-only
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose pull
docker compose up -d
```

Run migrations explicitly once migration commands are finalized. Never change public exposure as part of an update without a separate review.

## Rollback

1. Stop writes if possible.
2. Restore the last known good image tag or git revision.
3. Restore database and object backups when a migration changed persistent state.
4. Re-run health checks and admin access checks.
5. Record the failed version, migration state, and remediation in the incident log.

## Monitoring

Track at least:

- API, web, admin, LiteLLM, Postgres, Redis, Weaviate, and object storage health.
- Login, signup, provider validation, chat stream, and RAG upload rate limits.
- LiteLLM spend sync failures and budget enforcement status.
- Admin actions and failed authorization attempts.
- Disk growth for Postgres, object storage, and Weaviate.

Do not log chat content, provider keys, OAuth tokens, session cookies, authorization headers, LiteLLM keys, or MCP secret payloads.

## Hardening

- Keep admin on a separate protected hostname.
- Require MFA for administrative identities.
- Rotate service secrets when operators change.
- Use strict CORS allowlists.
- Keep all stateful services on private networks.
- Verify `pnpm security:env` before production starts.
- Keep backups encrypted and access-limited.

Last updated: 2026-05-03
