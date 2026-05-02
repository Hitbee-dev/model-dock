export const postgresSchema = [
  `create table if not exists users (
    id text primary key,
    email text not null unique,
    display_name text,
    status text not null,
    role text not null,
    created_at timestamptz not null,
    approved_at timestamptz,
    approved_by text
  )`,
  `create table if not exists provider_credentials (
    id text primary key,
    user_id text not null references users(id),
    provider text not null,
    encrypted_secret_ref text not null,
    key_id text not null,
    created_at timestamptz not null,
    deleted_at timestamptz
  )`,
  `create table if not exists conversations (
    id text primary key,
    user_id text not null references users(id),
    folder_id text,
    title text not null,
    storage_mode text not null,
    model_id text,
    provider_policy_id text,
    pinned boolean not null default false,
    archived boolean not null default false,
    deleted_at timestamptz,
    created_at timestamptz not null,
    updated_at timestamptz not null
  )`,
  `create table if not exists rag_documents (
    id text primary key,
    owner_id text not null references users(id),
    tenant_id text not null,
    workspace_id text,
    source_uri text not null,
    object_key text,
    object_byte_length bigint,
    object_checksum_sha256 text,
    status text not null,
    created_at timestamptz not null,
    indexed_at timestamptz,
    deleted_at timestamptz,
    failure_reason text
  )`,
  `create table if not exists rag_chunks (
    id text primary key,
    document_id text not null references rag_documents(id),
    tenant_id text not null,
    ordinal integer not null,
    text_checksum_sha256 text not null,
    weaviate_object_id text not null,
    unique(document_id, ordinal)
  )`,
  `create table if not exists audit_logs (
    id text primary key,
    actor_id text not null,
    action text not null,
    target_type text not null,
    target_id text not null,
    result text not null,
    created_at timestamptz not null
  )`
] as const;

export function renderPostgresSchema(): string {
  return `${postgresSchema.join(";\n\n")};\n`;
}
