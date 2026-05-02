# Contributing to ModelDock

Thank you for helping build ModelDock. Keep changes small, documented, and secure by default.

## Local setup

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker compose config
```

## Commit convention

Use Conventional Commits:

```text
<type>(<scope>): <summary>
```

Allowed types:

```text
feat fix docs chore refactor test build ci perf style security release
```

## Security rules

- Never commit `.env`, provider keys, OAuth tokens, LiteLLM master keys, session secrets, encryption keys, Cloudflare tokens, or local agent runtime state.
- Keep LiteLLM master keys server-only.
- Keep admin functionality on the separate admin app and hostname design.
- Document any new feature in the relevant docs page.

## Definition of done

A change is done when it is implemented, documented, verified, and safe from secret or private data leaks.
