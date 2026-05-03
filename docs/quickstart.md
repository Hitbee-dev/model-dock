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

Debug mode is the default local mode. It is designed for localhost testing and
seeds the first local admin as `admin/admin` when no active owner or admin
exists.

Open:

```text
Web app:   http://127.0.0.1:3000
Admin app: http://127.0.0.1:3001
API:       http://127.0.0.1:3002
```

LiteLLM and Postgres are internal-only by default.

## First admin setup

1. Open `http://127.0.0.1:3001`.
2. Sign in with `admin/admin`.
3. Follow the account setup redirect and change the admin ID or email and
   password.
4. If you cancel setup, the default debug credentials remain active. Only do
   this for temporary local testing.

## User signup

Users request access from the user app. Requests remain pending until an owner
or admin approves them from the admin app.

## Security caveats

Do not use placeholder secrets in production. Admin is a separate service and
must be deployed behind a separate protected hostname before public exposure.
Use release mode for any domain-connected deployment.

## Related links

- [Docker deployment](deployment/docker.md)
- [Debug and release modes](deployment/modes.md)
- [Administrator guide](admin-guide.md)
- [User guide](user-guide.md)
- [Production Docker](deployment/production-docker.md)
- [Architecture](architecture.md)
- [Security](security.md)

Last updated: 2026-05-03
