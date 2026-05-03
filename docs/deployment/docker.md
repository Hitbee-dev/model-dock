# Docker Deployment

ModelDock provides a Docker Compose scaffold for local-only development and private-origin production planning.

## What is this page for?

Use this page to validate the Compose topology and understand safe defaults.

## Commands

```bash
cp .env.example .env
docker compose config
docker compose up -d
```

## Services

| Service | Default exposure |
| --- | --- |
| web | `127.0.0.1:3000` |
| admin | `127.0.0.1:3001` |
| api | `127.0.0.1:3002` |
| litellm | Docker network only |
| postgres | Docker network only |

## Security caveats

Replace every `replace-with-*` value before production. Do not publish Postgres or LiteLLM directly to the internet. Put admin behind a separate protected hostname.

## Related links

- [Quickstart](../quickstart.md)
- [Cloudflare deployment](cloudflare.md)
- [Production Docker](production-docker.md)
- [Operations runbook](operations.md)

Last updated: 2026-05-03
