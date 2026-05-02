# Roadmap

## Phase 0 - Repository hygiene

- [x] Rename public docs from old working title to ModelDock.
- [x] Add `.gitignore`, MIT license, community files, workspace config, hooks, CI, and `.env.example`.
- [x] Add placeholder lint, typecheck, test, and build scripts.

## Phase 1 - Installable skeleton

- [x] Add Docker Compose with Postgres, LiteLLM, web, admin, and API services.
- [x] Add Redis, Weaviate, and S3-compatible object storage scaffolding for RAG.
- [x] Bind host-published services to `127.0.0.1` by default.
- [x] Add `modeldock init` CLI placeholder.
- [x] Add environment validation package.
- [x] Add health endpoints for web, admin, and API placeholders.
- [x] Add Docker and local development docs.
- [x] Prepare initial public npm package manifests for requested `@modeldock/*` packages.
- [x] Create or gain access to the npm `@modeldock` organization/scope and publish packages.

## Phase 2 - Auth and owner bootstrap

- [ ] Implement one-time owner bootstrap backed by `OWNER_BOOTSTRAP_TOKEN`.
- [ ] Add local login or OIDC-ready auth.
- [ ] Add role model: owner, admin, operator, user.
- [ ] Add session security, CSRF protection, secure cookies, and auth rate limits.
- [ ] Enforce admin-host checks in API and admin app.
- [ ] Add Cloudflare Access validation middleware.

## Phase 3 - LiteLLM integration

- [x] Implement LiteLLM user creation contract.
- [x] Implement virtual key generation contract.
- [ ] Map ModelDock credits to LiteLLM budgets.
- [ ] Enforce model allowlists.
- [ ] Add spend sync job.
- [ ] Add mock and live LiteLLM integration tests.

## Phase 4 - BYOK and provider vault

- [ ] Implement provider connection UI.
- [ ] Store provider credentials encrypted at rest.
- [ ] Validate user-owned API keys with minimal requests.
- [ ] Add credential deletion and rotation.
- [ ] Add provider-specific docs for OpenAI, Anthropic, Gemini, OpenRouter, Ollama, and vLLM.

## Phase 5 - Chat and folders

- [ ] Implement per-user conversations and folders.
- [ ] Add server-stored conversation mode.
- [ ] Add local-only conversation mode with IndexedDB and clear warnings.
- [ ] Stream responses through LiteLLM.
- [ ] Add export and import.
- [ ] Display calm reasoning summaries without exposing hidden chain-of-thought.

## Phase 5.5 - RAG

- [x] Add RAG package contracts, chunking, and Weaviate retrieval planning.
- [ ] Implement document upload ingestion.
- [ ] Implement embedding generation through server-side provider routes.
- [ ] Implement tenant-scoped retrieval injection for chat.
- [ ] Add deletion propagation from object storage, PostgreSQL metadata, and Weaviate.

## Phase 6 - MCP and skills

- [ ] Add MCP server registry.
- [ ] Add per-user MCP configuration.
- [ ] Require permission before tool execution.
- [ ] Add skill registry foundation and permission declarations.

## Phase 7 - External visibility

- [ ] Build rendered docs site.
- [ ] Add OpenGraph assets.
- [ ] Add JSON-LD to rendered pages.
- [ ] Submit sitemap through Google Search Console and Bing Webmaster Tools.

## Phase 8 - Deployment hardening

- [ ] Add production Docker guide.
- [ ] Add Helm chart templates.
- [ ] Add backup, restore, update, rollback, monitoring, and hardening docs.
