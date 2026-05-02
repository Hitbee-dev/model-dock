import { describe, expect, it } from "vitest";
import { createSpendLedgerEntry, mapCreditsToLiteLLMBudget } from "./index.js";

describe("credit contracts", () => {
  it("maps USD credits to LiteLLM budget shape", () => {
    expect(mapCreditsToLiteLLMBudget({ userId: "user-1", amountUsd: 5 })).toEqual({
      maxBudget: 5,
      budgetDuration: "30d"
    });
  });

  it("rejects invalid credit grants", () => {
    expect(() => mapCreditsToLiteLLMBudget({ userId: "user-1", amountUsd: 0 })).toThrow("positive");
  });

  it("records LiteLLM spend as a negative ledger entry", () => {
    expect(
      createSpendLedgerEntry({
        userId: "user-1",
        spendUsd: 1.25,
        externalId: "spend-1",
        createdAt: "2026-05-02T00:00:00.000Z"
      }).amountUsd
    ).toBe(-1.25);
  });
});
