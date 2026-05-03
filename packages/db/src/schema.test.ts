import { describe, expect, it } from "vitest";
import { renderPostgresSchema } from "./schema.js";

describe("postgres schema", () => {
  it("declares the core approval and RAG tables", () => {
    const schema = renderPostgresSchema();

    expect(schema).toContain("create table if not exists users");
    expect(schema).toContain("password_hash_value text");
    expect(schema).toContain("alter table users add column if not exists password_hash_value text");
    expect(schema).toContain("create table if not exists sessions");
    expect(schema).toContain("create table if not exists messages");
    expect(schema).toContain("foreign key (conversation_id, user_id)");
    expect(schema).toContain("check (content_stored = true or content is null)");
    expect(schema).toContain("create table if not exists litellm_virtual_keys");
    expect(schema).toContain("create table if not exists credit_ledger_entries");
    expect(schema).toContain("create table if not exists rag_documents");
    expect(schema).toContain("create table if not exists rag_chunks");
    expect(schema).toContain("tenant_id text not null");
    expect(schema).toContain("create table if not exists audit_logs");
  });
});
