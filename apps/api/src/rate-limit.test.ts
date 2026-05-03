import { describe, expect, it } from "vitest";
import { createMemoryRateLimiter } from "./rate-limit.js";

describe("memory rate limiter", () => {
  it("denies requests after the configured window limit", () => {
    const limiter = createMemoryRateLimiter(() => 1_000);

    expect(limiter.allow("signup:127.0.0.1", { limit: 2, windowSeconds: 60 }).allowed).toBe(true);
    expect(limiter.allow("signup:127.0.0.1", { limit: 2, windowSeconds: 60 }).allowed).toBe(true);
    expect(limiter.allow("signup:127.0.0.1", { limit: 2, windowSeconds: 60 }).allowed).toBe(false);
  });
});

