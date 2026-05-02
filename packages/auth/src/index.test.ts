import { describe, expect, it } from "vitest";
import { approveRegistration, assertRole, canAccessAdmin, canBootstrapOwner, createPendingRegistration } from "./index.js";

describe("auth contracts", () => {
  it("keeps admin access limited to owner and admin roles", () => {
    expect(canAccessAdmin("owner")).toBe(true);
    expect(canAccessAdmin("admin")).toBe(true);
    expect(canAccessAdmin("operator")).toBe(false);
    expect(canAccessAdmin("user")).toBe(false);
  });

  it("allows owner bootstrap only once with the expected token hash", () => {
    expect(
      canBootstrapOwner({
        state: { ownerExists: false, bootstrapTokenHash: "token-hash" },
        providedTokenHash: "token-hash"
      })
    ).toBe(true);
    expect(
      canBootstrapOwner({
        state: { ownerExists: true, bootstrapTokenHash: "token-hash" },
        providedTokenHash: "token-hash"
      })
    ).toBe(false);
  });

  it("rejects unknown roles", () => {
    expect(assertRole("operator")).toBe("operator");
    expect(() => assertRole("superadmin")).toThrow("Unknown");
  });

  it("normalizes pending registration email before approval", () => {
    const pending = createPendingRegistration({
      id: "reg_1",
      email: " USER@Example.COM ",
      now: "2026-05-02T00:00:00.000Z"
    });

    expect(pending.email).toBe("user@example.com");
    expect(approveRegistration(pending, { approvedBy: "owner_1", now: pending.requestedAt }).status).toBe("active");
  });

  it("rejects invalid registration email", () => {
    expect(() =>
      createPendingRegistration({ id: "reg_1", email: "not-email", now: "2026-05-02T00:00:00.000Z" })
    ).toThrow("valid email");
  });
});
