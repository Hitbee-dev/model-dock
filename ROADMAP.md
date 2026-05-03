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

- [x] Implement one-time owner bootstrap contract backed by `OWNER_BOOTSTRAP_TOKEN`.
- [x] Add local login route with server-side password verification.
- [x] Add role model: owner, admin, operator, user.
- [x] Add session token, CSRF token, and secure cookie helper contracts.
- [x] Wire auth rate limits into concrete login endpoint.
- [ ] Persist sessions outside in-memory API process storage.
- [x] Enforce admin-host checks in API scaffold.
- [x] Add persistent PostgreSQL-backed signup approval storage.
- [x] Add public signup rate limiting scaffold.
- [x] Add Cloudflare Access validation contract.
- [ ] Wire Cloudflare Access validation into admin runtime middleware.

## Phase 3 - LiteLLM integration

- [x] Implement LiteLLM user creation contract.
- [x] Implement virtual key generation contract.
- [x] Harden LiteLLM config rendering against YAML injection.
- [x] Map ModelDock credits to LiteLLM budgets.
- [x] Enforce model allowlist contract.
- [x] Add spend sync ledger contract.
- [x] Add LiteLLM spend log normalization and client query contract.
- [ ] Add live spend sync job.
- [ ] Add mock and live LiteLLM integration tests.

## Phase 4 - BYOK and provider vault

- [ ] Implement provider connection UI.
- [x] Store provider credentials encrypted at rest with AES-256-GCM adapter and AAD context.
- [x] Validate user-owned API keys with minimal server-side requests.
- [x] Add rate-limited API endpoint for provider validation.
- [x] Add credential deletion contract.
- [ ] Add credential rotation implementation.
- [ ] Add provider-specific docs for OpenAI, Anthropic, Gemini, OpenRouter, Ollama, and vLLM.

## Phase 5 - Chat and folders

- [x] Implement per-user conversation and folder contracts.
- [x] Add server-stored conversation mode contract.
- [x] Add local-only conversation mode contract.
- [ ] Implement browser IndexedDB local-only storage and clear warnings.
- [x] Add OpenAI-compatible streaming event parser contract.
- [ ] Stream responses through LiteLLM from the API to the browser.
- [x] Add server export/import and separate browser local-only export DTO.
- [x] Add stream contract that drops raw reasoning content by default.
- [ ] Display calm reasoning summaries in the web UI when safe summaries exist.

## Phase 5.5 - RAG

- [x] Add RAG package contracts, chunking, and Weaviate retrieval planning.
- [x] Add tenant-scoped document ingest and deletion plans.
- [ ] Implement document upload ingestion endpoint and persistence.
- [ ] Implement embedding generation through server-side provider routes.
- [x] Implement tenant-scoped retrieval injection contract for chat.
- [ ] Wire tenant-scoped retrieval injection into the chat API.
- [ ] Add deletion propagation from object storage, PostgreSQL metadata, and Weaviate.

## Phase 6 - MCP and skills

- [x] Add MCP server registry contract.
- [x] Add per-user MCP configuration contract.
- [x] Require permission before tool execution.
- [x] Add skill registry foundation and permission declarations.

## Phase 7 - External visibility

- [ ] Build rendered docs site.
- [ ] Add OpenGraph assets.
- [ ] Add JSON-LD to rendered pages.
- [ ] Submit sitemap through Google Search Console and Bing Webmaster Tools.

## Phase 8 - Deployment hardening

- [ ] Add production Docker guide.
- [ ] Add Helm chart templates.
- [ ] Add backup, restore, update, rollback, monitoring, and hardening docs.
