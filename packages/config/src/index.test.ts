import { describe, expect, it } from "vitest";
import { validateModelDockEnv } from "./index.js";

const baseEnv = {
  PUBLIC_APP_URL: "http://127.0.0.1:3000",
  PUBLIC_API_URL: "http://127.0.0.1:3002",
  ADMIN_APP_URL: "http://127.0.0.1:3001",
  DATABASE_URL: "postgresql://modeldock:pass@postgres:5432/modeldock",
  REDIS_URL: "redis://:pass@redis:6379/0",
  RAG_ENABLED: "true",
  WEAVIATE_URL: "http://weaviate:8080",
  WEAVIATE_API_KEY: "replace-with-local-weaviate-app-key",
  S3_ENDPOINT: "http://objectstore:8333",
  S3_BUCKET: "modeldock-local",
  S3_ACCESS_KEY_ID: "replace-with-local-s3-access-key",
  S3_SECRET_ACCESS_KEY: "replace-with-local-s3-secret-key",
  SESSION_SECRET: "replace-with-strong-random-session-secret",
  CREDENTIAL_ENCRYPTION_KEY: "replace-with-strong-random-32-byte-key",
  OWNER_BOOTSTRAP_TOKEN: "replace-with-one-time-local-bootstrap-token",
  LITELLM_BASE_URL: "http://litellm:4000",
  LITELLM_MASTER_KEY: "replace-with-strong-litellm-master-key",
  EXPERIMENTAL_SUBSCRIPTION_OAUTH: "false",
  EXPERIMENTAL_CHATGPT_SUBSCRIPTION: "false",
  EXPERIMENTAL_CLAUDE_SUBSCRIPTION: "false"
};

describe("validateModelDockEnv", () => {
  it("allows placeholder secrets in development", () => {
    expect(validateModelDockEnv(baseEnv).nodeEnv).toBe("development");
  });

  it("rejects placeholder secrets in production", () => {
    expect(() =>
      validateModelDockEnv({
        ...baseEnv,
        NODE_ENV: "production"
      })
    ).toThrow("placeholder secrets");
  });

  it("allows RAG infrastructure to be disabled explicitly", () => {
    expect(validateModelDockEnv({ ...baseEnv, RAG_ENABLED: "false" }).ragEnabled).toBe(false);
  });
});
