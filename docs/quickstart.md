# Quickstart

ModelDock is an open-source control plane for self-hosted multi-user LLM apps built on LiteLLM.

## What is this page for?

Use this page to run the current local-only scaffold and verify that Phase 0 and Phase 1 project checks are working.

## Local commands

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
cp .env.example .env
docker compose config
docker compose up -d
```

Open:

```text
Web app:   http://127.0.0.1:3000
Admin app: http://127.0.0.1:3001
API:       http://127.0.0.1:3002
```

LiteLLM and Postgres are internal-only by default.

## Security caveats

Do not use placeholder secrets in production. Admin is a separate service and must be deployed behind a separate protected hostname before public exposure.

## Related links

- [Docker deployment](deployment/docker.md)
- [Architecture](architecture.md)
- [Security](security.md)

Last updated: 2026-05-02
