# Architecture

ModelDock is a LiteLLM-first control plane for running a self-hosted multi-user LLM service.

## What is ModelDock architecture?

ModelDock separates the user app, public API, admin app, database, credential vault, credit ledger, and LiteLLM proxy. LiteLLM remains the model gateway; ModelDock owns service operations and user experience.

```text
Browser
  -> Web App / Chat UI
  -> Control Plane API
      -> Auth and user database
      -> Credit ledger
      -> Credential vault
      -> LiteLLM user and virtual key management
  -> LiteLLM Proxy
      -> OpenAI / Anthropic / Gemini / OpenRouter / Ollama / vLLM
  -> Admin App on a separate protected host
```

## Who is this for?

This page is for contributors and operators deciding where a feature belongs.

## Boundaries

| Layer | Responsibility |
| --- | --- |
| Web app | Chat UI, provider settings, credit dashboard, local-only chat store |
| API | Auth, profiles, BYOK vault, credit ledger, LiteLLM orchestration |
| Admin app | Users, providers, credits, audit logs, system settings |
| LiteLLM | Provider routing, virtual keys, budgets, spend tracking |
| Postgres | Persistent ModelDock and LiteLLM state |
| Redis | Sessions, cache, rate-limit counters, short-lived jobs |
| Weaviate | Tenant-scoped vector search for RAG |
| S3-compatible storage | Documents, attachments, exports, backups |

Chat storage contracts live in `@modeldock/chat`. Server-stored conversations persist message content in the database. Local-only conversations keep message content in browser storage and store only metadata server-side when needed.

## Security caveats

The LiteLLM master key is server-only. Admin routes must fail closed outside the configured admin host.

## Related links

- [LiteLLM](litellm.md)
- [Storage and RAG](storage-rag.md)
- [Security](security.md)
- [Cloudflare deployment](deployment/cloudflare.md)

Last updated: 2026-05-02
