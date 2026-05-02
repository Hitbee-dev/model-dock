# Security Model

ModelDock is designed for secure self-hosted multi-user LLM services.

## What is the ModelDock security model?

ModelDock uses localhost-only defaults, separate admin hosting, server-only LiteLLM master keys, encrypted provider credential storage, least-privilege roles, rate limits, and audit logs.

## Who is this for?

This page is for operators, contributors, and security reviewers.

## Baseline controls

- App, admin, and API bind to localhost unless explicitly exposed.
- Admin is a separate app and production hostname.
- LiteLLM and Postgres are internal-only in Docker Compose.
- Public self-registration is disabled by default.
- Production mode must reject placeholder secrets.
- Provider credentials and OAuth tokens are encrypted at rest.
- Chat content and secrets are not logged.
- Admin API approval routes require a trusted admin-host header from a controlled proxy plus an admin API token. The public API must not trust client-supplied `Host` headers for admin separation.

## Production secret preflight

Before any production deployment, run:

```bash
pnpm security:env
```

This fails if service-owned secrets such as Postgres, Redis, Weaviate, object storage, LiteLLM, session, encryption, owner bootstrap, or admin API credentials are missing or still use `replace-with-*` placeholders.

## Subscription OAuth warning

ModelDock is designed for user-owned provider credentials. Do not use this project to share a single personal AI subscription account across multiple users unless the provider's terms explicitly allow it.

Experimental subscription OAuth adapters are disabled by default, per-user only, removable, and clearly labeled experimental.

## Related links

- [BYOK](byok.md)
- [Cloudflare deployment](deployment/cloudflare.md)
- [LiteLLM](litellm.md)

Last updated: 2026-05-02
