# Security Policy

## Supported versions

ModelDock has not reached a public stable release. Security fixes are applied to the active development branch until versioned releases exist.

## Reporting a vulnerability

Do not open a public issue for sensitive vulnerabilities. Use a private GitHub security advisory or contact the maintainer through a private channel listed on the project repository.

Include:

- Affected commit or version.
- Reproduction steps.
- Impact and likely exploitability.
- Whether secrets, provider credentials, chat content, session tokens, OAuth tokens, or LiteLLM keys may be exposed.

## Security baseline

ModelDock must not log chat content, provider keys, OAuth tokens, refresh tokens, session cookies, authorization headers, MCP secret payloads, or LiteLLM keys. Provider credentials and OAuth tokens must be encrypted at rest and must never be returned to the browser after initial save.

Default deployments bind app, admin, and API services to localhost. LiteLLM and Postgres are internal-only in Docker Compose. Production admin access must use a separate protected hostname plus application-level owner/admin authorization.
