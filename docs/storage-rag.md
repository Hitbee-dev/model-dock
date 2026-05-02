# Storage and RAG

ModelDock uses separate storage systems for separate jobs.

## Storage roles

| System | Role | Default local service |
| --- | --- | --- |
| PostgreSQL | Product data, users, approvals, conversations, audit metadata | `postgres` |
| Redis | In-memory cache, sessions, rate-limit counters, short-lived queues | `redis` |
| Weaviate | Vector search for RAG chunks and document metadata | `weaviate` |
| S3-compatible object storage | Uploaded documents, attachments, exports, and backups | `objectstore` |

All services stay on the Docker private network by default. The host publishes only web, admin, and API ports on `127.0.0.1`.

## Object storage decision

ModelDock keeps object storage behind `@modeldock/storage` so operators can use AWS S3, Cloudflare R2, MinIO, SeaweedFS, Garage, or another S3-compatible service.

The local Docker Compose default is SeaweedFS, not MinIO. Current MinIO materials describe a split where MinIO Object Store remains AGPLv3 and AIStor is commercially licensed. That can be a valid choice for some operators, but it is not the least surprising default for an MIT-licensed project skeleton. SeaweedFS upstream is Apache-2.0 and S3-compatible, so it is a lower-friction local default while ModelDock keeps the provider replaceable.

Operators may still configure MinIO or AIStor explicitly after reviewing their licensing, support, and distribution requirements.

## RAG design

The RAG pipeline is intentionally staged:

1. Store original files in S3-compatible object storage.
2. Store document and indexing metadata in PostgreSQL.
3. Chunk text with deterministic IDs in `@modeldock/rag`.
4. Store vectors and tenant-scoped chunk metadata in Weaviate.
5. Cache retrieval and rate-limit state in Redis.
6. Send retrieved context through server-side LiteLLM routes only.

Tenant scoping is required on every vector query. The tenant scope must be derived server-side from the authenticated owner or workspace, never from client-submitted tenant IDs. RAG payloads must not include provider keys, LiteLLM keys, session tokens, or hidden reasoning traces.

## Production notes

- Replace every `replace-with-*` value before production.
- Enable Weaviate API key auth and RBAC.
- Keep Redis, Weaviate, PostgreSQL, LiteLLM, and object storage off the public internet.
- Use object storage lifecycle policies for stale uploads and exports.
- Treat `robots.txt` as crawler guidance only, never as data protection.

Last updated: 2026-05-02
