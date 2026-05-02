# AGENTS.md - ModelDock Build and Operating Manual

This file is the primary execution guide for AI coding agents working on **ModelDock**.

Treat this file as the highest-priority project guide after system and developer instructions. Use it together with `README.md` and `SKILL.md`. The repository may initially contain only these three files. That is expected.

## 0. Project identity

### 0.1 Name

```text
Display name: ModelDock
Repository slug: model-dock
Primary npm package: modeldock
Create package: create-modeldock
CLI package: @modeldock/cli
CLI command: modeldock
Owner domain: user-provided domain
Primary project domain, recommended: modeldock.example.com
```

### 0.2 One-line definition

> **ModelDock is an open-source control plane for self-hosted multi-user LLM apps: dock providers, BYOK credentials, credits, budgets, LiteLLM routing, and chat interfaces into one deployable service.**

### 0.3 Repository description

Use this GitHub repository description:

```text
Open-source control plane for self-hosted multi-user LLM apps: dock providers, BYOK keys, credits, budgets, and chat UIs on LiteLLM.
```

### 0.4 Core positioning

ModelDock is not just another chat UI. ModelDock is the missing service-operator layer between:

```text
OpenWebUI / LibreChat style user experience
        +
LiteLLM gateway, virtual keys, budgets, spend tracking
        +
self-hosted auth, BYOK, credits, deployment, security, docs
```

Position ModelDock as:

```text
A LiteLLM-first, self-hosted baseline for launching a private multi-user LLM service.
```

Do **not** position ModelDock as:

- A way to bypass provider terms, rate limits, payment, or account restrictions.
- A tool for sharing one personal ChatGPT, Codex, Claude, Gemini, Kimi, Qwen, Copilot, or other subscription account across multiple users.
- A model provider.
- A payment processor.
- A direct fork, clone, or rebrand of OpenWebUI, LibreChat, or LiteLLM.
- A finished commercial hosting platform.

ModelDock may be inspired by OpenWebUI, LibreChat, and LiteLLM, but the implementation must be original unless dependency licenses explicitly permit reuse.

## 1. Non-negotiable founder requirements

The following requirements came directly from the project owner. Do not dilute them.

### 1.1 Installability

Any developer should be able to install ModelDock with at least one of these paths:

```text
Docker Compose
Kubernetes / Helm
npm / npx CLI installer
```

The project must support easy upgrades when versions change. Every installation path must have matching documentation.

Minimum install targets:

```bash
# Docker Compose
cp .env.example .env
docker compose up -d

# npm / npx
npm create modeldock@latest
# or
npx modeldock init

# Kubernetes / Helm, once implemented
helm install modeldock ./charts/modeldock
```

Minimum update targets:

```bash
# Docker Compose
docker compose pull
docker compose up -d
modeldock migrate

# npm / npx
npm update -g modeldock
modeldock upgrade

# Kubernetes / Helm
helm upgrade modeldock ./charts/modeldock
```

If a path is not implemented yet, create docs that clearly mark it as planned and create an issue-style TODO under `/docs/roadmap`.

### 1.2 Codex and Oh My Codex workflow files

The owner currently develops with Codex and Oh My Codex, and may later use Claude and Oh My Claude.

Add these to `.gitignore` immediately:

```gitignore
# Local AI agent tooling
.omc/
.omx/
.omc*
.omx*
.codex/
.claude/
```

Never commit local agent sessions, scratchpads, prompts containing secrets, or generated runtime state.

### 1.3 Empty repo bootstrap

Assume the first real development run starts from an almost-empty repository containing only:

```text
README.md
SKILL.md
AGENTS.md
```

The first task is to turn that empty repository into a production-shaped open-source project skeleton and then continue implementing the MVP.

### 1.4 Security-first public deployment

Default behavior must be safe for a person who clicks once and runs it.

Default deployment behavior:

```text
- App binds to localhost only unless explicitly exposed.
- Admin UI is disabled until the first owner is bootstrapped.
- No public self-registration unless explicitly enabled.
- No provider keys required to start the app.
- No secret is generated with a predictable default in production mode.
- No admin or LiteLLM master key is exposed to browsers.
- No chat content, provider key, OAuth token, session token, or LiteLLM key is logged.
```

ModelDock must also support users who intentionally connect a real domain through Cloudflare, using a domain they control.

### 1.5 License strategy

Initial license recommendation:

```text
MIT License
```

However, the owner is interested in a future custom license similar in spirit to OpenWebUI's approach, especially to prevent others from taking the framework, rebranding it, and selling hosted access without contributing back.

Important legal/product rule:

```text
If ModelDock starts as MIT, existing MIT releases remain MIT forever.
A later custom license cannot claw back rights already granted for old versions.
```

Therefore:

- Use MIT initially unless the owner explicitly chooses a source-available license before first public release.
- Do not copy OpenWebUI code unless the license obligations are fully understood and preserved.
- Add `LICENSE_STRATEGY.md` before a major release if the owner wants future source-available restrictions.
- If a future license restricts commercial hosting, do not call that version OSI-open-source unless the license actually qualifies.
- Consider DCO or CLA early if future relicensing flexibility matters.

### 1.6 Admin surface must be special and separate

The admin page and normal user page must not be the same endpoint.

Required production pattern:

```text
User app:   https://app.modeldock.example.com or https://modeldock.example.com
Public API: https://api.modeldock.example.com
Admin app:  https://admin-<random-slug>.modeldock.example.com
```

Never rely on `/admin` as the only security boundary.

Admin access must require multiple layers:

```text
1. Separate admin hostname or separate private listener.
2. Cloudflare Access or equivalent identity-aware proxy when public.
3. Application-level owner/admin role check.
4. WebAuthn or TOTP MFA for owner/admin accounts.
5. One-time bootstrap token generated locally, never committed.
6. Strict rate limits and audit logs.
7. No direct LiteLLM Admin UI exposure unless separately protected.
```

In production, `/admin` on the normal user hostname should return 404 or redirect to documentation explaining that admin lives on a separate protected endpoint.

### 1.7 Provider API is official; subscription OAuth is experimental

Officially supported connection model:

```text
- User-owned provider API keys, also called BYOK.
- Platform-owned provider API keys configured by the server owner.
- OpenAI-compatible endpoints.
- LiteLLM-supported providers.
```

Experimental connection model:

```text
- ChatGPT / Codex Pro subscription OAuth adapters.
- Claude Max subscription OAuth adapters.
- Other provider subscription OAuth adapters.
```

Rules for subscription OAuth:

- It must be feature-flagged and disabled by default.
- It must be clearly labeled experimental in UI and docs.
- It must be implemented per user, never as one shared central subscription token for all users.
- It must include provider terms warnings.
- It must be removable without breaking the stable API contract.
- It must never be marketed as a way to bypass API billing or provider terms.
- If no official API exists, mark the adapter as community/experimental and fail closed.

Suggested env gate:

```env
EXPERIMENTAL_SUBSCRIPTION_OAUTH=false
EXPERIMENTAL_CHATGPT_SUBSCRIPTION=false
EXPERIMENTAL_CLAUDE_SUBSCRIPTION=false
```

### 1.8 LiteLLM is required infrastructure

LiteLLM is not optional decoration. It is a core dependency and gateway.

Required design:

```text
ModelDock Control Plane
  -> LiteLLM Proxy
    -> OpenAI / Anthropic / Gemini / OpenRouter / Ollama / vLLM / other providers
```

Do not build a parallel provider gateway unless necessary for a documented adapter gap. Prefer wrapping and orchestrating LiteLLM.

LiteLLM integration must be easy to update:

- Pin LiteLLM versions in Docker/Helm/npm templates.
- Keep LiteLLM config generation isolated in one package.
- Do not fork LiteLLM for normal features.
- Add integration tests for LiteLLM user creation, virtual key generation, budget enforcement, model allowlists, and spend tracking.
- Create a compatibility table under `/docs/litellm/compatibility.md`.

### 1.9 GUI web version first

Build the GUI web app first.

Core chat requirements:

```text
- Per-user chats.
- Per-user folders.
- Rename, delete, archive, pin, and search chats.
- Folder-level organization.
- Model selection per chat.
- Provider selection or routing policy per chat where allowed.
- Streaming responses.
- Smooth reasoning/thinking status display.
- Export/import conversations.
```

Storage modes:

```text
Default: server-stored chats.
Optional: local-only chats.
```

Server-stored mode:

- Chat content is stored in the database.
- User can access chats across devices.
- Admin UI must not casually expose private chat content.
- Content must not be logged.

Local-only mode:

- Chat content is stored only in the user's browser storage, preferably IndexedDB.
- Server does not store message content.
- The same user will not see local-only chats from another device or browser.
- UI must warn users before enabling local-only mode.
- Admin and server cannot recover local-only chats.

### 1.10 MCP and skills must be easy

ModelDock must make MCP and skills integration simple.

Required direction:

```text
- MCP server registry UI.
- Per-user MCP configuration.
- Workspace-level MCP configuration later.
- Permission prompt before tool execution.
- Secret separation between providers, MCP servers, and app secrets.
- Tool call audit logs without leaking sensitive payloads.
- Clear docs for adding an MCP server.
- Clear docs for adding a skill.
```

Use `SKILL.md` style documentation for project-level operational skills and future plugin skills. A skill must be easy to add, inspect, disable, and document.

### 1.11 No AI slop in UI

Default product UI must be polished and restrained.

Rules:

- Do not use random emoji in UI copy.
- Do not use emoji as visual filler.
- Do not add juvenile badges, sparkles, rockets, wizard hats, or decorative nonsense.
- Icons should be professional SVG icons or generated brand assets.
- Empty states should be quiet, useful, and concise.
- Thinking indicators should feel natural and calm.
- Do not show raw hidden chain-of-thought.
- If a model provides reasoning summaries, display them as concise progress summaries or collapsible work notes only when appropriate.

Recommended tone:

```text
Clear, quiet, precise, operator-grade, friendly without being childish.
```

### 1.12 Commit convention and Husky are required

Use Husky or equivalent local hooks from the start.

Required:

```text
.husky/pre-commit
.husky/commit-msg
.husky/pre-push
commitlint.config.*
lint-staged config
```

Commit format:

```text
<type>(<scope>): <summary>
```

Allowed types:

```text
feat
fix
docs
chore
refactor
test
build
ci
perf
style
security
release
```

Examples:

```text
feat(auth): add first owner bootstrap flow
security(vault): encrypt provider credentials at rest
docs(deploy): add Cloudflare Tunnel guide
fix(chat): prevent local-only messages from syncing to server
```

Suggested hook behavior:

```text
pre-commit: format, lint staged files, scan obvious secrets
commit-msg: enforce Conventional Commits
pre-push: typecheck, tests, build smoke test when practical
```

## 2. Recommended architecture

### 2.1 High-level architecture

```text
Browser
  -> Web App
      -> User chat UI
      -> Provider settings
      -> Credit dashboard
      -> Local-only chat store
  -> Public API
      -> Auth
      -> User profile
      -> Chat metadata/content when server-stored
      -> BYOK credential vault
      -> Credit ledger
      -> LiteLLM orchestration
  -> LiteLLM Proxy
      -> LLM providers
  -> Admin App, separate protected host
      -> Users
      -> Credits
      -> Providers
      -> LiteLLM status
      -> Audit logs
      -> System settings
```

### 2.2 Suggested stack

Prefer this stack unless there is a strong reason to change:

```text
Language: TypeScript first
Package manager: pnpm
Monorepo: pnpm workspaces, optionally Turborepo
Web: Next.js App Router or another SSR-capable framework
API: Hono/Fastify/NestJS or Next.js route handlers for MVP
Database: PostgreSQL
ORM: Drizzle or Prisma
Cache/queue: Redis optional
Auth: Auth.js, OIDC-ready, or equivalent
Credential crypto: libsodium or WebCrypto envelope encryption
Testing: Vitest, Playwright, integration tests
Lint/format: Biome or ESLint + Prettier
Commit hooks: Husky + commitlint + lint-staged
Container: Docker, Docker Compose
Kubernetes: Helm chart later
Gateway: LiteLLM Proxy
```

If the agent chooses a different stack, it must document the reason in `/docs/architecture/stack-decision.md`.

### 2.3 Monorepo layout

Create a clean layout:

```text
.
├── apps/
│   ├── web/                    # User-facing web app
│   ├── admin/                  # Admin app, separate host
│   └── api/                    # Control plane API, if separated from web
├── packages/
│   ├── auth/                   # Auth helpers and guards
│   ├── byok/                   # Provider credential flows
│   ├── config/                 # Environment schema and app config
│   ├── credits/                # Credit ledger and budget logic
│   ├── crypto/                 # Encryption helpers
│   ├── db/                     # Schema, migrations, query helpers
│   ├── litellm/                # LiteLLM client and config generator
│   ├── mcp/                    # MCP registry and execution contracts
│   ├── skills/                 # Skill registry and parser
│   ├── ui/                     # Shared UI components
│   └── types/                  # Shared TypeScript types
├── cli/                        # modeldock CLI
├── charts/modeldock/           # Helm chart
├── docker/                     # Dockerfiles and entrypoints
├── docs/                       # Public docs
├── examples/                   # Example deployments and configs
├── scripts/                    # Utility scripts
├── .github/                    # Workflows, issue templates, PR template
├── .husky/                     # Git hooks
├── docker-compose.yml
├── .env.example
├── README.md
├── SKILL.md
├── AGENTS.md
└── LICENSE
```

### 2.4 Required data domains

ModelDock must model these domains explicitly:

```text
User
Session
Role
Workspace, later
ProviderConnection
ProviderCredential
ModelPolicy
LiteLLMUser
LiteLLMVirtualKey
CreditGrant
CreditLedgerEntry
BudgetPolicy
Conversation
ConversationFolder
Message
MessageAttachment
MCPServer
MCPPermission
Skill
AuditLog
SystemSetting
```

## 3. Bootstrap task order for agents

When starting from the empty repository, execute tasks in this order.

### 3.1 Phase 0 - repository hygiene

1. Update `README.md` from any old working title to **ModelDock**.
2. Update `SKILL.md` from placeholders to **ModelDock**.
3. Create `.gitignore` with Node, Python, Docker, local DB, editor, secrets, `.omc`, `.omx`, `.codex`, `.claude` ignores.
4. Add `LICENSE` as MIT unless already present.
5. Add `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, `ROADMAP.md`.
6. Add `.github/ISSUE_TEMPLATE`, `.github/PULL_REQUEST_TEMPLATE.md`.
7. Add `package.json`, `pnpm-workspace.yaml`, base TypeScript config, lint config, test config.
8. Add Husky and commitlint.
9. Add CI workflows.
10. Add `.env.example` with safe placeholders.

Acceptance criteria:

```text
- `pnpm install` works.
- `pnpm lint` works or is scaffolded clearly.
- `pnpm test` works or has a placeholder test.
- `pnpm typecheck` works.
- Husky commit message hook exists.
- README says ModelDock, not LLM Service Starter Kit.
```

### 3.2 Phase 1 - installable skeleton

1. Create Docker Compose with Postgres, LiteLLM, web, admin, and API services as applicable.
2. Ensure default services bind to localhost.
3. Create `modeldock init` CLI placeholder.
4. Create env schema validation.
5. Create health endpoints.
6. Create docs for Docker install and local development.

Acceptance criteria:

```text
- `docker compose config` succeeds.
- `docker compose up` can start the base services or has documented placeholders.
- App opens on localhost.
- LiteLLM is configured but protected.
- No production secret has a fixed default.
```

### 3.3 Phase 2 - auth and owner bootstrap

1. Implement first owner bootstrap.
2. Add local login or OIDC-ready auth.
3. Add role model: owner, admin, operator, user.
4. Add session security, CSRF, secure cookies, and rate limits.
5. Add admin app separation.
6. Add Cloudflare Access integration plan and docs.

Acceptance criteria:

```text
- First owner can be created once.
- Admin route is not accessible on normal user hostname.
- Admin API requires admin host + auth + role.
- Login is rate limited.
```

### 3.4 Phase 3 - LiteLLM integration

1. Add LiteLLM client package.
2. Add LiteLLM config generator.
3. Add user creation and virtual key creation flow.
4. Add per-user budget mapping.
5. Add model allowlist mapping.
6. Add spend sync job.
7. Add LiteLLM compatibility docs.

Acceptance criteria:

```text
- New user can receive a LiteLLM user/key record.
- Credits map to LiteLLM budget where applicable.
- Model allowlist can be enforced.
- LiteLLM master key is server-only.
```

### 3.5 Phase 4 - BYOK and provider vault

1. Add provider connection UI.
2. Add encrypted provider credential storage.
3. Add user-owned API key validation.
4. Add OpenAI-compatible endpoint registration.
5. Add credential deletion and rotation.
6. Add docs for OpenAI, Anthropic, Gemini, OpenRouter, Ollama/vLLM.

Acceptance criteria:

```text
- Provider keys are encrypted at rest.
- Provider keys never appear in logs.
- User can delete a provider credential.
- BYOK docs warn users to use their own credentials and provider terms.
```

### 3.6 Phase 5 - chat and folders

1. Implement chat list.
2. Implement folders.
3. Implement server-stored conversations.
4. Implement local-only conversation mode.
5. Implement streaming responses via LiteLLM.
6. Implement export/import.
7. Implement clean thinking/reasoning display.

Acceptance criteria:

```text
- Each user only sees their own chats.
- Chats can be moved into folders.
- Local-only chats do not persist message content on the server.
- Server-stored chats are available across devices.
- Streaming UI is smooth and not gimmicky.
```

### 3.7 Phase 6 - MCP and skills

1. Add MCP server registry.
2. Add MCP connection settings.
3. Add permission prompt UI.
4. Add skill registry foundation.
5. Add docs for adding MCP servers and skills.

Acceptance criteria:

```text
- User can add or inspect an MCP server config.
- Tool execution requires permission.
- Skills have human-readable documentation.
- Secrets are isolated per user/workspace.
```

### 3.8 Phase 7 - external visibility

1. Create docs site.
2. Add `robots.txt`.
3. Add `sitemap.xml`.
4. Add `llms.txt`.
5. Add `llms-full.txt`.
6. Add JSON-LD.
7. Add comparison docs for OpenWebUI, LibreChat, LiteLLM.
8. Add FAQ pages mapping to search intent.
9. Add GitHub topics.
10. Add OpenGraph/Twitter card images.

Acceptance criteria:

```text
- Docs are readable without login.
- Docs render as static or SSR HTML.
- No important docs page has noindex or nosnippet.
- AI search crawlers are not blocked from public docs.
- Admin/app-private surfaces are blocked and protected.
```

### 3.9 Phase 8 - deployment hardening

1. Add Cloudflare deployment guide for generic domains.
2. Add Docker production guide.
3. Add Kubernetes guide.
4. Add backup/restore docs.
5. Add security hardening docs.
6. Add update/rollback docs.
7. Add monitoring docs.

Acceptance criteria:

```text
- A user can deploy locally without exposing the app.
- A user can expose through Cloudflare safely.
- Admin endpoint remains separate and protected.
- Upgrade path is documented.
- Backup path is documented.
```

## 4. Domain and Cloudflare plan

The project supports user-provided domains through Cloudflare.

### 4.1 Recommended domain map

For the owner deployment:

```text
modeldock.example.com                 Public landing page and docs
app.modeldock.example.com             User app
api.modeldock.example.com             Public API for app and clients
admin-<random>.modeldock.example.com  Admin app, protected by Cloudflare Access
status.modeldock.example.com          Optional status page
```

For generic self-hosters, support env-based host configuration:

```env
PUBLIC_SITE_URL=https://modeldock.example.com
PUBLIC_APP_URL=https://app.modeldock.example.com
PUBLIC_API_URL=https://api.modeldock.example.com
ADMIN_APP_URL=https://admin-random.modeldock.example.com
TRUSTED_ORIGINS=https://modeldock.example.com,https://app.modeldock.example.com
```

### 4.2 Cloudflare recommendations

For docs and landing:

```text
- Use Cloudflare Pages or another static/SSR host.
- Serve `robots.txt`, `sitemap.xml`, `llms.txt`, and `llms-full.txt` at stable public URLs.
- Do not enable a managed robots policy that blocks AI crawlers if discoverability is desired.
```

For self-hosted app/API:

```text
- Use Cloudflare Tunnel when exposing a private origin.
- Use Full Strict TLS.
- Use WAF managed rules.
- Add rate limiting to login, signup, API, chat completions, provider validation, and token refresh endpoints.
- Add Turnstile or equivalent bot challenge where appropriate.
- Use origin firewall rules to block direct origin access when possible.
```

For admin:

```text
- Put admin on a random or non-obvious admin subdomain.
- Protect it with Cloudflare Access.
- Allow only owner/admin emails or an identity group.
- Require MFA at the IdP level.
- Still enforce application-level admin role checks.
```

Cloudflare is not a replacement for application security. Treat it as one gate in a layered gatehouse.

## 5. Security requirements

### 5.1 Secrets

Never commit:

```text
.env
.env.* except .env.example
provider API keys
LiteLLM master key
OAuth client secrets
OAuth refresh tokens
session secrets
encryption keys
private keys
Cloudflare tokens
service account JSON files
local AI agent session files
```

`.env.example` must contain placeholders only.

### 5.2 Credential vault

Provider credentials and OAuth tokens must be encrypted at rest.

Minimum requirements:

```text
- Envelope encryption or strong symmetric encryption.
- Per-environment master key.
- Key rotation plan.
- No plaintext key in logs.
- No plaintext key returned to browser after initial save.
- Delete means cryptographic deletion where possible.
```

Suggested env:

```env
CREDENTIAL_ENCRYPTION_KEY=replace-with-strong-random-key
CREDENTIAL_ENCRYPTION_KEY_ID=default-v1
```

### 5.3 Authentication and authorization

Required controls:

```text
- Secure session cookies.
- CSRF protection for browser state-changing requests.
- Strict CORS allowlist.
- MFA for admin accounts.
- Role checks on every admin/API operation.
- Rate limits for auth and provider validation.
- Session revocation.
- Audit logs for admin actions.
```

Roles:

```text
owner: full control, initial bootstrap, system settings
admin: user/credit/provider management, no owner transfer unless allowed
operator: support/ops, limited visibility
user: own chats, own provider keys, own credits
```

### 5.4 Admin separation

Do not expose these on public user routes:

```text
/admin
/api/admin
/litellm/admin
/internal
```

In production, admin must be served from the configured admin host only. Requests to admin routes from non-admin hostnames must fail closed.

### 5.5 LiteLLM security

- LiteLLM master key must be server-only.
- LiteLLM Admin UI must not be public by default.
- If LiteLLM UI is exposed, it must be behind Cloudflare Access or equivalent and app-level authentication.
- User requests must use virtual keys or server-mediated calls.
- Never send the LiteLLM master key to the browser.

### 5.6 Logging

Do not log:

```text
message content by default
provider keys
OAuth tokens
refresh tokens
LiteLLM keys
session cookies
authorization headers
MCP secret payloads
```

Audit logs should record metadata:

```text
who did what, when, source IP/ASN where appropriate, target resource ID, result
```

Do not record secrets or private chat content in audit logs.

### 5.7 Public docs versus private surfaces

Public docs should be crawlable. Private app/admin data must be authenticated.

Do not use `robots.txt` for security. It only guides crawlers.

## 6. Chat UX requirements

### 6.1 Conversation structure

Each user must have their own conversation namespace.

Data model should support:

```text
folder
conversation
message
attachment
model selection
provider routing metadata
storage mode
pinned state
archived state
deleted state
created/updated timestamps
```

Folders:

```text
- Create folder
- Rename folder
- Delete folder
- Move chat to folder
- Search within folder
- All chats view
```

### 6.2 Storage modes

Server mode:

```text
storage_mode = server
```

Local-only mode:

```text
storage_mode = local
```

Local-only mode rules:

- Use IndexedDB or equivalent browser storage.
- Do not store message content server-side.
- Store only minimal server metadata if absolutely needed, and make that explicit.
- Warn user that local-only chats are not available on other devices.
- Export/import must be available.

### 6.3 Thinking and reasoning display

Do not show hidden chain-of-thought. Do not fake it.

Acceptable UI:

```text
- "Working..."
- "Searching docs..."
- "Calling tool..."
- "Reviewing result..."
- concise model-provided reasoning summary, if available and safe
```

Unacceptable UI:

```text
- fake internal monologue
- raw private chain-of-thought
- excessive animated gimmicks
- emoji-heavy status text
```

## 7. Provider strategy

### 7.1 Official provider support

Officially support these through API keys or OpenAI-compatible endpoints first:

```text
OpenAI API
Anthropic API
Google Gemini API
OpenRouter
Ollama
vLLM
Any OpenAI-compatible endpoint supported by LiteLLM
```

Provider docs must include:

```text
- Where to create a key.
- How to paste the key.
- How it is encrypted.
- How to delete it.
- Which models are supported.
- How credits and budgets apply.
- What ModelDock does not control.
```

### 7.2 Platform-owned keys

Server owners may configure platform-owned API keys in `.env`.

Rules:

- Keys are used only for users allowed by policy.
- Budgets and rate limits must apply.
- Admins can disable platform-owned provider access.
- Usage must be visible to the admin.

### 7.3 BYOK

BYOK is the preferred default.

BYOK flow:

```text
1. User signs up.
2. User opens Provider Settings.
3. User connects provider key or OpenAI-compatible endpoint.
4. ModelDock validates the connection using a minimal request.
5. Credential is encrypted and stored.
6. User chooses models allowed from that provider.
7. Chat calls route through ModelDock and LiteLLM.
8. User can revoke/delete the credential.
```

### 7.4 Experimental subscription OAuth

Examples:

```text
ChatGPT / Codex Pro OAuth
Claude Max OAuth
Other subscription-based OAuth connectors
```

Implementation contract:

```text
interface ExperimentalProviderAdapter {
  id: string;
  displayName: string;
  stability: 'experimental';
  termsWarning: string;
  isEnabled(config): boolean;
  startAuth(userId): Promise<AuthStartResult>;
  completeAuth(userId, callback): Promise<CredentialRef>;
  refresh(userId, credentialRef): Promise<void>;
  revoke(userId, credentialRef): Promise<void>;
  createLiteLLMRoute(userId, credentialRef): Promise<RouteConfig>;
}
```

Do not make subscription OAuth part of the stable public promise. Use feature flags and clear docs.

## 8. LiteLLM integration details

### 8.1 Responsibilities

ModelDock should use LiteLLM for:

```text
- Provider routing.
- OpenAI-compatible API surface.
- Virtual keys.
- User/team budget enforcement.
- Spend tracking.
- Rate limits where supported.
- Provider abstraction.
```

ModelDock should provide:

```text
- Signup.
- Auth.
- BYOK UI.
- Credential vault.
- Credit ledger.
- Admin workflows.
- Chat UI.
- Conversation storage.
- Docs and deployment baseline.
```

### 8.2 LiteLLM update policy

- Track LiteLLM upstream releases.
- Keep a compatibility matrix.
- Do not hardcode assumptions that can be read from LiteLLM responses.
- Keep LiteLLM API calls in `packages/litellm`.
- Add mock and real integration tests.
- Fail closed if LiteLLM budget enforcement status is unknown.

### 8.3 Credit mapping

User-facing credits may be shown as USD-equivalent credits by default.

Example:

```text
User sees: $5 credit
ModelDock ledger: credit_grant + usage entries
LiteLLM: max_budget=5, budget_duration=30d
```

Keep a separate ledger even if LiteLLM tracks spend. LiteLLM is enforcement and spend source; ModelDock ledger is product truth and audit trail.

## 9. MCP and skills

### 9.1 MCP goals

MCP must feel easy and safe.

Required features:

```text
- Add MCP server from UI.
- Add MCP server from config file.
- Test MCP server connection.
- Enable/disable MCP server per user.
- Permission prompt before using tools.
- Tool call audit metadata.
- Secret fields are write-only.
```

### 9.2 Skills goals

Skills should be human-readable operational units.

A skill may contain:

```text
SKILL.md
metadata.json
examples/
scripts/
fixtures/
```

Skill rules:

- Each skill must document what it does.
- Each skill must declare permissions.
- Each skill must be disabled by default if it can access the network, filesystem, shell, user credentials, or provider tokens.
- User or admin must explicitly enable risky skills.

## 10. Installation and upgrade design

### 10.1 Docker Compose

Required files:

```text
docker-compose.yml
docker-compose.prod.yml, optional
docker/.env.example
docker/entrypoint.sh
docs/deployment/docker.md
```

Compose must include:

```text
postgres
litellm
web
admin
api if separate
redis optional
```

Security defaults:

```text
- Bind web/admin/api to localhost by default.
- Do not publish Postgres publicly.
- Do not publish LiteLLM publicly by default.
- Require generated secrets for production.
```

### 10.2 npm / npx

Packages to reserve and implement:

```text
modeldock
create-modeldock
@modeldock/cli
```

CLI commands:

```bash
modeldock init
modeldock doctor
modeldock migrate
modeldock create-owner
modeldock rotate-secret
modeldock backup
modeldock restore
modeldock upgrade
```

The CLI should generate configuration and deployment templates, not hide unsafe magic.

### 10.3 Kubernetes

Eventually provide:

```text
charts/modeldock/Chart.yaml
charts/modeldock/values.yaml
charts/modeldock/templates/*
docs/deployment/kubernetes.md
```

Kubernetes requirements:

```text
- Separate deployments for web, admin, api, litellm.
- Postgres externalizable.
- Secrets via Kubernetes Secrets or external secret manager.
- Ingress examples for Cloudflare.
- Helm upgrade docs.
```

### 10.4 Upgrade rules

- Use semantic versioning.
- Database migrations must be explicit.
- Provide rollback notes.
- Backup before destructive migrations.
- Use changelog entries for every release.
- Never silently change default exposure from localhost to public.

## 11. Branding and assets

### 11.1 Image generation

Use ChatGPT Images 2.0 / GPT Image 2 for web icons, OpenGraph images, diagrams, and product illustration assets when available.

Rules:

- Do not make asset generation a build-time requirement.
- If ChatGPT Images 2.0 is unavailable, use clean SVG placeholders and continue.
- Store prompts under `assets/prompts/`.
- Store generated assets under `assets/generated/` or `apps/web/public/` as appropriate.
- Include alt text and metadata.
- Avoid copying the visual style of existing brands.
- Avoid copyrighted characters, logos, or UI screenshots from other products.
- Optimize files before committing.

Suggested assets:

```text
favicon.svg
logo.svg
og-image.png
docs-og-image.png
empty-chat.svg
provider-dock-illustration.png
architecture-diagram.svg
```

### 11.2 Visual direction

ModelDock should feel like:

```text
calm infrastructure
secure control plane
model harbor / provider dock
operator-grade but approachable
```

Avoid:

```text
emoji confetti
AI slop
childish mascot overload
copycat OpenWebUI or LibreChat visuals
provider logo misuse
```

## 12. AI search and discoverability

`SKILL.md` contains the detailed discovery guide. This section summarizes required implementation.

### 12.1 Public docs surface

Create:

```text
/docs/quickstart
/docs/architecture
/docs/litellm
/docs/auth
/docs/byok
/docs/credits
/docs/security
/docs/deployment/docker
/docs/deployment/kubernetes
/docs/deployment/cloudflare
/docs/mcp
/docs/skills
/docs/troubleshooting
/comparisons/openwebui
/comparisons/librechat
/comparisons/litellm
/faq
/roadmap
/changelog
/llms.txt
/llms-full.txt
/robots.txt
/sitemap.xml
```

### 12.2 Crawler policy

Public docs should be crawlable by search and AI answer engines.

Recommended docs `robots.txt`:

```txt
User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: GPTBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

Sitemap: https://modeldock.example.com/sitemap.xml
```

If the owner later wants to block training while allowing AI search, adjust training crawlers separately. Do not block search/user fetchers if the goal is AI answer visibility.

Private app/admin surfaces should use `noindex` and authentication, but never rely on `robots.txt` as the only control.

### 12.3 LLM-readable files

Create `llms.txt`:

```text
# ModelDock

> ModelDock is an open-source control plane for self-hosted multi-user LLM apps built around LiteLLM.
> It docks providers, BYOK credentials, credits, budgets, routing, chat UI, admin controls, MCP, and skills into one deployable service.

## Start here
- Quickstart
- Architecture
- LiteLLM integration
- BYOK provider setup
- Credits and budgets
- Security model
- Cloudflare deployment

## Comparisons
- ModelDock vs OpenWebUI
- ModelDock vs LibreChat
- ModelDock vs LiteLLM
```

Create `llms-full.txt` with a longer Markdown summary of architecture, installation, security, and provider support.

### 12.4 Structured metadata

Add JSON-LD to the landing/docs site:

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  "name": "ModelDock",
  "description": "Open-source control plane for self-hosted multi-user LLM apps with LiteLLM, BYOK credentials, credits, budgets, and chat UI.",
  "codeRepository": "https://github.com/modeldock/model-dock",
  "programmingLanguage": ["TypeScript"],
  "runtimePlatform": ["Docker", "Node.js", "PostgreSQL", "LiteLLM"],
  "applicationCategory": "DeveloperApplication"
}
```

### 12.5 Search intent docs

Create pages for these queries:

```text
self-hosted LLM service
LiteLLM frontend
BYOK LLM UI
multi-user ChatGPT UI
OpenWebUI alternative with LiteLLM
LibreChat alternative with BYOK
LLM credit management
OpenAI-compatible gateway UI
private ChatGPT for friends
internal AI portal starter kit
```

## 13. GitHub repository setup

### 13.1 Repository basics

Set:

```text
Repository name: model-dock
Owner: ModelDock maintainers
Description: Open-source control plane for self-hosted multi-user LLM apps: dock providers, BYOK keys, credits, budgets, and chat UIs on LiteLLM.
Visibility: Public, when ready
License: MIT, initially
.gitignore: Node, then extend manually
Website: https://modeldock.example.com
```

### 13.2 Topics

Add GitHub topics:

```text
litellm
llm
llmops
self-hosted
selfhosted
byok
bring-your-own-key
openai-compatible
llm-gateway
ai-gateway
chatbot-ui
multi-user
credits
budget-management
mcp
model-context-protocol
openwebui
librechat
docker-compose
kubernetes
```

GitHub may limit topic count. If limited, prioritize:

```text
litellm
llm
self-hosted
byok
openai-compatible
llm-gateway
multi-user
mcp
openwebui
librechat
```

### 13.3 Security features

Enable or configure:

```text
- Secret scanning.
- Push protection.
- Dependabot alerts.
- Dependabot security updates.
- Dependabot version updates.
- CodeQL code scanning.
- Branch protection for `main`.
- Required status checks once CI exists.
- Signed commits, if practical.
```

### 13.4 Community health

Add:

```text
README.md
LICENSE
SECURITY.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
.github/ISSUE_TEMPLATE/*
.github/PULL_REQUEST_TEMPLATE.md
```

Enable:

```text
Issues
Discussions
Projects, optional
Releases
Packages, for GHCR images
```

Disable if not needed:

```text
Wiki, unless documentation intentionally lives there
```

### 13.5 Release behavior

Use:

```text
v0.1.0
v0.2.0
v1.0.0
```

Every release needs:

```text
- CHANGELOG entry.
- Docker image tag.
- npm package version, when packages exist.
- Migration notes.
- Upgrade notes.
- Security notes.
```

## 14. `.gitignore` baseline

Create or update `.gitignore` with at least:

```gitignore
# Environment
.env
.env.*
!.env.example

# Secrets
*.pem
*.key
*.crt
*.p12
*.pfx
secrets/
credentials/
service-account*.json
cloudflare-token*.json

# Local AI agent tooling
.omc/
.omx/
.omc*
.omx*
.codex/
.claude/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Node / package managers
node_modules/
.pnpm-store/
.yarn/
.npm/
dist/
build/
.next/
.nuxt/
.svelte-kit/
.turbo/
.vercel/
coverage/

# Python, for scripts or LiteLLM helpers
__pycache__/
*.py[cod]
.venv/
venv/
.pytest_cache/
.mypy_cache/
.ruff_cache/

# Database / local state
*.sqlite
*.sqlite3
*.db
data/
.storage/
.local-state/

# Docker / local infra
docker-compose.override.yml
docker-compose.local.yml

# OS / editors
.DS_Store
Thumbs.db
.idea/
.vscode/*
!.vscode/extensions.json
!.vscode/settings.example.json

# Generated assets metadata that may contain private prompts, unless intentionally public
assets/private/
```

## 15. Required initial files

### 15.1 `package.json`

Create scripts similar to:

```json
{
  "name": "model-dock",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "format": "pnpm -r format",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "prepare": "husky"
  }
}
```

### 15.2 Commitlint

Create `commitlint.config.cjs`:

```js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'chore', 'refactor', 'test', 'build', 'ci', 'perf', 'style', 'security', 'release'
    ]]
  }
};
```

### 15.3 GitHub Actions

Create minimum workflows:

```text
.github/workflows/ci.yml
.github/workflows/codeql.yml
.github/workflows/dependabot-auto-triage.yml, optional
```

CI should run:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### 15.4 Dependabot

Create `.github/dependabot.yml` for:

```text
npm / pnpm
GitHub Actions
Docker
```

## 16. Documentation requirements

All docs must be in English first. Korean docs may be added later under `/docs/ko`.

Required docs:

```text
docs/quickstart.md
docs/architecture.md
docs/litellm.md
docs/auth.md
docs/byok.md
docs/credits.md
docs/security.md
docs/deployment/docker.md
docs/deployment/kubernetes.md
docs/deployment/cloudflare.md
docs/mcp.md
docs/skills.md
docs/troubleshooting.md
docs/comparisons/openwebui.md
docs/comparisons/librechat.md
docs/comparisons/litellm.md
docs/faq.md
```

Every major page must include:

```text
- One clear definition paragraph.
- Who this page is for.
- Step-by-step commands where applicable.
- Security caveats.
- Related links.
```

## 17. Cloudflare deployment guide requirements

`docs/deployment/cloudflare.md` must include:

```text
- Recommended subdomain map.
- DNS records.
- Cloudflare Pages for docs.
- Cloudflare Tunnel for self-hosted app/API.
- Cloudflare Access for admin.
- WAF and rate limiting recommendations.
- Turnstile optional setup.
- TLS Full Strict recommendation.
- Origin hardening.
- AI crawler policy.
```

Do not instruct users to expose Postgres, Redis, LiteLLM master admin, or internal APIs directly to the public internet.

## 18. What not to build first

Do not start with these unless core skeleton is done:

```text
- Complex billing processor.
- Full RAG stack.
- Full marketplace.
- Fancy agent orchestration.
- Dozens of subscription OAuth adapters.
- Deep custom model router replacing LiteLLM.
- Custom license implementation.
```

First build the reliable dock. Add the lighthouse later.

## 19. Agent behavior protocol

When working in this repository:

1. Read `README.md`, `SKILL.md`, and `AGENTS.md` before coding.
2. Treat `AGENTS.md` as the build plan.
3. Do not ask clarification questions unless blocked by missing secrets, account access, or a destructive decision.
4. If a requirement cannot be completed, write a concrete TODO file or issue draft and continue with the next useful task.
5. Prefer implementing working scaffolds over writing vague plans.
6. Keep all generated code secure by default.
7. Run relevant checks before finishing.
8. Use Conventional Commits.
9. Never commit secrets.
10. Keep docs and code in sync.

## 20. First Codex execution prompt

When using Codex or Oh My Codex in the empty repository, paste this prompt as the first instruction:

```text
Read README.md, SKILL.md, and AGENTS.md completely. Treat AGENTS.md as the primary build manual for ModelDock.

Start from this empty repository and turn it into the initial ModelDock open-source project skeleton. Do not stop after planning. Implement the repository structure, update README.md and SKILL.md to use the ModelDock name, create .gitignore with .omc and .omx ignored, add MIT LICENSE, community files, package.json, pnpm workspace, Husky + commitlint, CI, .env.example, Docker Compose scaffold with LiteLLM, docs skeleton, llms.txt, robots.txt, sitemap placeholder, and Cloudflare deployment docs.

Use secure defaults: localhost-only by default, separate admin host design, no public LiteLLM admin exposure, no committed secrets, encrypted credential vault placeholders, and clear experimental flags for subscription OAuth.

Use LiteLLM as required infrastructure. Build the architecture so future updates to LiteLLM are isolated in a package.

Follow Conventional Commits. Run lint/typecheck/test/build where available. If a command cannot run because the project is not yet implemented, add the minimum working placeholder and continue. If a feature cannot be fully completed in this session, create a TODO or roadmap entry with exact next steps and continue to the next task. Keep going until Phase 0 and Phase 1 acceptance criteria in AGENTS.md are satisfied or until every remaining blocker is explicitly documented.
```

## 21. References for agents

Use official documentation when implementing current integrations. Important reference categories:

```text
OpenAI crawlers and user agents
OpenAI GPT Image 2 / image generation docs
OpenAI Codex plan docs
LiteLLM proxy, virtual keys, budgets, users, provider docs
GitHub repository security, secret scanning, topics, community standards
Google Search Central AI features, robots meta, structured data
IndexNow documentation
Cloudflare Pages, Tunnel, Access, WAF, rate limiting, AI Crawl Control
```

Do not blindly trust stale blog posts for security, provider auth, or crawler behavior. Check official docs when behavior may have changed.

## 22. Final product promise

ModelDock should let a developer say:

```text
I want to run a safe, self-hosted, multi-user LLM service.
I want users to bring their own provider keys or use my configured provider budget.
I want LiteLLM routing and spend controls without building all the glue myself.
I want a clean chat UI, folders, credits, admin controls, MCP, skills, and deployment docs.
I want the project to be discoverable by humans and AI answer engines.
```

Then ModelDock should make that true.
