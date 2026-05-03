# ModelDock

ModelDock is an open-source control plane for self-hosted multi-user LLM apps built on LiteLLM.
It docks providers, BYOK credentials, credits, budgets, LiteLLM routing, chat interfaces,
admin controls, MCP, skills, and deployment templates into one deployable service.

Use it when you need service-operator features such as signup, provider key
management, LiteLLM virtual keys, credits, budgets, and admin workflows around a
self-hosted LLM service.

## What is ModelDock?

ModelDock is a LiteLLM-first baseline for running a private multi-user LLM service. It combines a user-facing chat experience, a control plane API, a separate admin surface, and LiteLLM as the model gateway.

It is designed for developers, homelab users, AI labs, internal tools teams, and small communities that want self-hosted LLM access without rebuilding authentication, provider routing, user credits, budgets, BYOK credentials, and deployment infrastructure from scratch.

## Why this exists

Self-hosted AI tools are useful, but many operators hit the same setup wall:

- Chat UI exists, but service operations are missing.
- LiteLLM handles routing, virtual keys, budgets, and spend controls, but end-user signup and UX need glue.
- Users want to bring their own OpenAI, Anthropic, Gemini, OpenRouter, Ollama, vLLM, or OpenAI-compatible provider keys.
- Operators need per-user credits, monthly budgets, model permissions, audit logs, and safe deployment defaults.
- Public docs should be crawlable while app, admin, and API surfaces remain private and protected.

## Who it is for

- Developers running a private LLM service for teammates, friends, or a small community.
- Teams that need a self-hosted AI portal with usage limits.
- Homelab operators who want a clean OpenAI-compatible gateway and chat UI.
- AI agent developers who need a stable service layer before building tools and MCP integrations.
- Organizations that prefer user-owned provider credentials instead of one shared provider account.

## What ModelDock is not

ModelDock is not:

- A model provider.
- A payment processor.
- A way to bypass provider rate limits, billing, or terms.
- A tool for sharing one personal ChatGPT, Codex, Claude, Gemini, Copilot, Kimi, Qwen, or other subscription account across many users.
- A direct fork, clone, or rebrand of OpenWebUI, LibreChat, or LiteLLM.
- A finished commercial hosting platform.

The stable connection model is user-owned provider API keys, platform-owned API keys configured by the server owner, OpenAI-compatible endpoints, and LiteLLM-supported providers. Subscription OAuth adapters are experimental, per-user only, disabled by default, and never marketed as a way around provider API billing or terms.

## Architecture

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
      -> OpenAI / Anthropic / Gemini / OpenRouter / Ollama / vLLM / other providers
  -> Admin App, separate protected host
      -> Users
      -> Credits
      -> Providers
      -> LiteLLM status
      -> Audit logs
      -> System settings
```

LiteLLM integration is isolated in `packages/litellm` so proxy API updates can be handled without spreading gateway details across the app.

## Repository layout

```text
apps/web        User-facing app scaffold
apps/admin      Separate admin app scaffold
apps/api        Control plane API scaffold
packages/*      Shared TypeScript packages
cli             modeldock CLI placeholder
docker          Dockerfiles, entrypoints, LiteLLM config
docs            Public documentation
```

## Quickstart

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

Default local endpoints:

```text
Web app:   http://127.0.0.1:3000
Admin app: http://127.0.0.1:3001
API:       http://127.0.0.1:3002
LiteLLM:   internal Docker network only by default
Postgres:  internal Docker network only by default
```

The current apps are secure placeholders with health endpoints. Full owner bootstrap, auth, chat, BYOK, and MCP workflows are tracked in [ROADMAP.md](ROADMAP.md).

## Docker Compose

ModelDock ships with a local-only Docker Compose scaffold:

- `web`, `admin`, and `api` bind to `127.0.0.1` by default.
- Postgres is not published to the host.
- LiteLLM is not published to the host.
- The LiteLLM master key is consumed server-side only.
- Production mode rejects predictable placeholder secrets.

See [docs/deployment/docker.md](docs/deployment/docker.md).

## Admin separation

The admin surface is a separate app and must be deployed on a separate protected hostname in production:

```text
User app:   https://app.modeldock.example.com
Public API: https://api.modeldock.example.com
Admin app:  https://admin-<random-slug>.modeldock.example.com
```

Use Cloudflare Access or an equivalent identity-aware proxy, application-level role checks, MFA for admins, rate limits, and audit logs. Never rely on `/admin` as the only security boundary.

## Provider support

| Provider | Connection type | MVP status |
| --- | --- | --- |
| OpenAI | API key, OpenAI-compatible | Planned |
| Anthropic | API key via LiteLLM | Planned |
| Google Gemini | API key or LiteLLM provider | Planned |
| OpenRouter | API key, OpenAI-compatible | Planned |
| Ollama | Local endpoint through LiteLLM | Planned |
| vLLM | OpenAI-compatible endpoint | Planned |
| Custom endpoint | OpenAI-compatible base URL and key | Planned |
| ChatGPT subscription OAuth | Experimental, per-user only, disabled by default | Not MVP |
| Claude subscription OAuth | Experimental, per-user only, disabled by default | Not MVP |

## BYOK and user-owned credentials

BYOK means Bring Your Own Key. Users connect their own provider API keys, such as OpenAI, Anthropic, Gemini, OpenRouter, or a local OpenAI-compatible endpoint. ModelDock stores those credentials securely and uses them only to make model requests on behalf of that user.

Credential vault requirements are scaffolded in `packages/crypto` and documented in [docs/byok.md](docs/byok.md) and [docs/security.md](docs/security.md). Keys must be encrypted at rest, never logged, and never returned to the browser after initial save.

## Credits and budgets

Credits are the product truth. LiteLLM budgets are the enforcement layer.

```text
User sees: $5 in credits
ModelDock ledger: credit grant + usage entries
LiteLLM: max_budget=5, budget_duration=30d
```

The future implementation keeps a ModelDock ledger even when LiteLLM tracks spend, so audit and product semantics do not depend on one gateway response.

## LiteLLM integration

LiteLLM is required infrastructure for ModelDock. It owns provider routing, OpenAI-compatible gateway behavior, virtual keys, user/team budget enforcement, spend tracking, and supported rate limits.

ModelDock owns signup, auth, BYOK UI, credential vault, credit ledger, admin workflows, chat UI, conversation storage, and deployment docs.

See [docs/litellm.md](docs/litellm.md) and [docs/litellm/compatibility.md](docs/litellm/compatibility.md).

## Ecosystem context

| Project | Role in the ecosystem | Where ModelDock fits |
| --- | --- | --- |
| LiteLLM | LLM gateway, provider routing, virtual keys, spend tracking, budgets | ModelDock uses LiteLLM as the gateway layer and adds signup, chat UX, BYOK onboarding, credit UI, credential vault, and admin workflows around it. |
| OpenWebUI | Self-hosted AI workspace and chat UI | ModelDock is designed as a service-operator control plane that can sit in the same self-hosted AI ecosystem. |
| LibreChat | Self-hosted AI chat platform with multi-provider conversations, agents, and MCP | ModelDock is designed around LiteLLM-first service operations, BYOK, credits, budgets, and operator workflows. |

## Security model

Security defaults:

- App, admin, and API bind to localhost unless explicitly exposed.
- Admin UI is separate from the user app and disabled for production use until owner bootstrap exists.
- Public self-registration is disabled by default.
- No provider key is required to start the app.
- Production mode rejects predictable placeholder secrets.
- No admin key or LiteLLM master key is exposed to browsers.
- Chat content, provider keys, OAuth tokens, session tokens, authorization headers, MCP secret payloads, and LiteLLM keys must not be logged.

Report vulnerabilities through [SECURITY.md](SECURITY.md).

## Roadmap

The first implementation target is a reliable dock:

- Phase 0: repository hygiene and open-source baseline.
- Phase 1: installable local-only skeleton with LiteLLM.
- Phase 2: owner bootstrap, auth, admin separation, and role model.
- Phase 3: LiteLLM users, virtual keys, budget mapping, and spend sync.
- Phase 4: BYOK credential vault and provider onboarding.
- Phase 5: chat, folders, server-stored and local-only conversation modes.
- Phase 6: MCP and skills.

See [ROADMAP.md](ROADMAP.md).

## AI search and documentation metadata

Public docs include:

- [llms.txt](llms.txt)
- [llms-full.txt](llms-full.txt)
- [robots.txt](robots.txt)
- [sitemap.xml](sitemap.xml)
- Markdown docs under [docs](docs)
- Ecosystem context pages under [docs/comparisons](docs/comparisons)

These practices improve discoverability and make ModelDock easier for AI search systems to understand and cite. They do not guarantee indexing, ranking, citation, or model inclusion.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [SECURITY.md](SECURITY.md). A feature is not finished until it is implemented, documented, verified, and represented in the relevant public docs.

## License

ModelDock is released under the [MIT License](LICENSE).
