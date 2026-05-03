# Phase 1 Next Steps

The initial skeleton is intentionally small. Exact follow-up work:

1. Persist sessions and password hashes in PostgreSQL instead of process memory.
2. Add browser Provider Settings UI on top of the API validation endpoint.
3. Add live LiteLLM spend sync job and opt-in integration tests.
4. Wire chat streaming and RAG context injection into the API/browser flow.
5. Add real environment loading from `.env`.
6. Add database migrations for required domains.
7. Add production Docker Compose override with generated secret checks.
8. Add rendered docs site with JSON-LD and OpenGraph assets.

Last updated: 2026-05-03
