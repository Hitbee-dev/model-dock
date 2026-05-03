# Production Docker

Use this guide when moving the Docker Compose scaffold from local validation toward a private production origin.

## Baseline rule

Do not publish ModelDock directly to the open internet from Docker Compose. Keep origins private and expose only intended HTTP services through a controlled reverse proxy or Cloudflare Tunnel.

## Required production changes

1. Copy `.env.example` to `.env`.
2. Replace every `replace-with-*` value with a strong generated secret.
3. Set `NODE_ENV=production`.
4. Keep Postgres, Redis, Weaviate, object storage, and LiteLLM off public host ports.
5. Serve user app, API, and admin app on separate hostnames.
6. Protect admin with Cloudflare Access or an equivalent identity-aware proxy.
7. Run `pnpm security:env` before starting production containers.

## Exposure model

```text
Public docs: rendered static site
User app:    private origin behind tunnel or reverse proxy
API:         private origin behind tunnel or reverse proxy
Admin app:   separate private origin behind Access and app role checks
LiteLLM:     Docker network only
Postgres:    Docker network only
Redis:       Docker network only
Weaviate:    Docker network only
Objectstore: Docker network only
```

## Production smoke test

```bash
pnpm security:env
docker compose config
docker compose up -d
curl -fsS http://127.0.0.1:3000/healthz
curl -fsS http://127.0.0.1:3001/healthz
curl -fsS http://127.0.0.1:3002/healthz
```

## LiteLLM

LiteLLM remains required infrastructure but must stay server-side. Do not expose the LiteLLM admin UI publicly. If operators intentionally expose it, put it behind identity-aware access controls and a separate administrative hostname.

## Related links

- [Docker deployment](docker.md)
- [Cloudflare deployment](cloudflare.md)
- [Operations runbook](operations.md)
- [Security](../security.md)

Last updated: 2026-05-03
