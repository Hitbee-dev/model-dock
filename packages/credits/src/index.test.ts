import { describe, expect, it } from "vitest";
import { mapCreditsToLiteLLMBudget } from "./index.js";

describe("credit contracts", () => {
  it("maps USD credits to LiteLLM budget shape", () => {
    expect(mapCreditsToLiteLLMBudget({ userId: "user-1", amountUsd: 5 })).toEqual({
      maxBudget: 5,
      budgetDuration: "30d"
    });
  });
});
