import { describe, expect, it } from "vitest";
import { defaultObjectStorageProvider, type ObjectStorageClient, redactObjectStorageConfig } from "./index.js";

describe("object storage contracts", () => {
  it("keeps secret keys out of redacted config", () => {
    const redacted = redactObjectStorageConfig({
      endpoint: "http://objectstore:8333",
      region: "us-east-1",
      bucket: "modeldock-local",
      accessKeyId: "access",
      secretAccessKey: "secret",
      forcePathStyle: true
    });

    expect("secretAccessKey" in redacted).toBe(false);
  });

  it("defaults local object storage to SeaweedFS", () => {
    expect(defaultObjectStorageProvider()).toBe("seaweedfs");
  });

  it("defines the storage client boundary", async () => {
    const client: ObjectStorageClient = {
      async putObject(request) {
        return request;
      },
      async getObject() {
        return new Uint8Array();
      },
      async deleteObject() {},
      async createPresignedGetUrl() {
        return "https://objects.example.com/file";
      }
    };

    await expect(client.createPresignedGetUrl({ key: "a", expiresInSeconds: 60 })).resolves.toContain("https://");
  });
});
