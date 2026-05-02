import { describe, expect, it } from "vitest";
import { renderPostgresSchema } from "./schema.js";

describe("postgres schema", () => {
  it("declares the core approval and RAG tables", () => {
    const schema = renderPostgresSchema();

    expect(schema).toContain("create table if not exists users");
    expect(schema).toContain("create table if not exists rag_documents");
    expect(schema).toContain("create table if not exists rag_chunks");
    expect(schema).toContain("tenant_id text not null");
    expect(schema).toContain("create table if not exists audit_logs");
  });
});
