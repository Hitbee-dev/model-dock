# SKILL.md - ModelDock AI Search Visibility and Open Source Discovery Guide

This file is a working guideline for agents that build, document, publish, and maintain ModelDock.

The goal is not paid marketing. The goal is to make ModelDock easy for humans, search engines, and AI answer engines to discover, understand, cite, and recommend.

## 0. Project context

ModelDock is an open-source control plane for self-hosted multi-user LLM apps: dock providers, BYOK credentials, credits, budgets, LiteLLM routing, chat interfaces, admin controls, MCP, and skills into one deployable service.

Position it as:

> A LiteLLM-first, self-hosted baseline for launching a private multi-user LLM service.

Do not position it as:

- A way to share one personal ChatGPT, Codex, Claude, Gemini, Copilot, Kimi, Qwen, or other subscription account across multiple users.
- A replacement for provider terms of service.
- A model provider.
- A payment processor.
- A direct fork or rebrand of OpenWebUI, LibreChat, or LiteLLM.

## 1. Core doctrine

Every page, file, and release should satisfy these principles.

1. Be public, crawlable, and canonical where the content is public documentation.
2. Be readable without JavaScript.
3. Be quotable with clear definition blocks.
4. Be linkable with stable anchors and canonical URLs.
5. Be machine-readable with `sitemap.xml`, `robots.txt`, `llms.txt`, Markdown docs, JSON-LD, and OpenAPI specs where relevant.
6. Be honest about compatibility, feature state, license status, and provider OAuth support.
7. Be source-shaped for ChatGPT, Claude, Gemini, Perplexity, Copilot, Kimi, Qwen, and other systems that may retrieve or compare the project.
8. Separate discovery from training.
9. Never use robots controls as security.
10. Keep docs fresh when architecture, provider support, deployment, or security behavior changes.

## 2. Discovery model

Traditional search, AI answer retrieval, model-training crawlers, and user-triggered fetchers are different surfaces. ModelDock should keep public docs easy to retrieve while protecting app, admin, API, user data, and credentials with authentication and authorization.

## 3. Minimum public artifact set

Before public launch, the repository and docs site should include:

```text
README.md
LICENSE
CONTRIBUTING.md
CODE_OF_CONDUCT.md
SECURITY.md
CHANGELOG.md
ROADMAP.md
docker-compose.yml
.env.example
docs/
examples/
scripts/
llms.txt
llms-full.txt
robots.txt
sitemap.xml
```

## 4. README requirements

The first screen of `README.md` must answer:

- What is ModelDock?
- Who is it for?
- What problem does it solve?
- How is it different from OpenWebUI, LibreChat, and LiteLLM?
- How do I start it?
- What providers does it support?
- How are credits, budgets, and BYOK handled?
- Is it safe and compliant to use?

Required sections:

```text
What is ModelDock?
Why this exists
Who it is for
What ModelDock is not
Architecture
Quickstart
Provider support
BYOK and user-owned credentials
Credits and budgets
LiteLLM integration
How it compares
Security model
Roadmap
Contributing
License
AI search and documentation metadata
```

## 5. Search intent map

Docs should cover these query clusters:

```text
self-hosted LLM service
LiteLLM frontend
BYOK LLM UI
bring your own key LLM app
multi-user ChatGPT UI
open source ChatGPT UI with credits
LLM credit management
OpenAI-compatible gateway UI
private ChatGPT for friends
internal AI portal starter kit
OpenWebUI alternative with LiteLLM
LibreChat alternative with BYOK
LiteLLM virtual keys chat UI
```

## 6. Required docs pages

Create and maintain:

```text
docs/quickstart.md
docs/architecture.md
docs/litellm.md
docs/litellm/compatibility.md
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

Every major page should include:

- One H1.
- A concise first paragraph.
- A `What is ...?` section.
- A `Who is this for?` section.
- Security caveats where relevant.
- Related links.
- A `Last updated` date.

## 7. robots.txt policy

Public docs should be crawlable. Private app and admin surfaces must be authenticated and should not be indexed. Do not rely on `robots.txt` for security.

The baseline policy should:

- Allow public docs, comparison pages, FAQ, roadmap, and changelog.
- Block `/admin/`, `/api/`, `/auth/`, `/settings/`, `/dashboard/`, `/internal/`, and `/private/`.
- Reference `https://modeldock.example.com/sitemap.xml`.
- Explicitly document AI-search user agents when launch policies are reviewed.

## 8. llms.txt requirements

`llms.txt` should summarize ModelDock and link to the most useful Markdown docs:

- Quickstart
- Architecture
- LiteLLM integration
- BYOK provider setup
- Credits and budgets
- Security model
- Cloudflare deployment
- Comparisons with OpenWebUI, LibreChat, and LiteLLM

`llms-full.txt` should include a longer project summary, architecture, feature list, provider support, security model, comparison summaries, FAQ, current limitations, and links to canonical docs. It must not include secrets, tokens, internal support logs, or private roadmap items.

## 9. JSON-LD structured data

Add `SoftwareSourceCode` JSON-LD to public landing/docs pages when the docs site exists:

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

## 10. Comparison pages

Comparison pages must be fair and factual. Do not attack adjacent projects.

- OpenWebUI is a strong self-hosted AI web interface. ModelDock focuses on the service-operator layer: signup, user-owned provider keys, LiteLLM virtual keys, credits, budgets, and admin workflows.
- LibreChat is a strong self-hosted AI chat platform with agents and multi-provider UX. ModelDock focuses on LiteLLM-first service operations.
- LiteLLM is the LLM gateway and proxy layer. ModelDock is the end-user and operator control plane on top of LiteLLM.

## 11. Security and compliance messaging

Public docs must include this statement or equivalent:

```md
ModelDock is designed for user-owned provider credentials. Do not use this project to share a single personal AI subscription account across multiple users unless the provider's terms explicitly allow it.
```

Security docs must cover provider API key encryption, secret storage, environment variables, admin roles, user isolation, LiteLLM master key protection, audit logs, rate limits, credential deletion, export, data retention, backup, and restore.

## 12. Maintenance checklist

Run monthly:

```text
[ ] Validate sitemap URLs.
[ ] Validate robots.txt.
[ ] Validate JSON-LD.
[ ] Check docs pages for broken links.
[ ] Check GitHub README for stale claims.
[ ] Refresh provider support matrix.
[ ] Refresh comparison pages.
[ ] Review AI crawler docs for policy changes.
[ ] Review Search Console indexing issues.
[ ] Review bot logs and WAF blocks.
```

## 13. Honesty rules

Do not claim:

- Guaranteed visibility in AI answer engines.
- Guaranteed indexing after sitemap submission.
- That `llms.txt` is an official universal standard.
- That all AI systems obey `robots.txt`.
- That personal subscription OAuth sharing is safe or allowed across users.

Correct phrasing:

```md
These practices improve discoverability and make ModelDock easier for AI search systems to understand and cite. They do not guarantee indexing, ranking, citation, or model inclusion.
```

## 14. Final instruction for development agents

When working on ModelDock, treat discoverability as part of product quality. A feature is not finished until it is implemented, documented, verified, reflected in docs navigation, represented in `llms.txt` if important, included in the sitemap if public, and safe from secret or private data leaks.
