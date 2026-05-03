# Phase 1 Next Steps

The initial skeleton is intentionally small. Exact follow-up work:

1. Implement first-owner password setup and `modeldock create-owner`.
2. Wire the Cloudflare Access public key/JWT verifier into the admin runtime guard.
3. Add browser Provider Settings UI on top of the API validation endpoint.
4. Add live LiteLLM spend sync job and opt-in integration tests.
5. Wire chat streaming and RAG context injection into the API/browser flow.
6. Add real environment loading from `.env`.
7. Add database migrations for required domains.
8. Add production Docker Compose override with generated secret checks.
9. Add rendered docs site with JSON-LD and OpenGraph assets.

Last updated: 2026-05-03
