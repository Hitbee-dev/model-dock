export type CreditGrant = {
  userId: string;
  amountUsd: number;
  expiresAt?: string;
};

export type LiteLLMBudget = {
  maxBudget: number;
  budgetDuration: string;
};

export type CreditLedgerEntry = {
  userId: string;
  amountUsd: number;
  source: "grant" | "litellm_spend";
  externalId?: string;
  createdAt: string;
};

export function mapCreditsToLiteLLMBudget(grant: CreditGrant, budgetDuration = "30d"): LiteLLMBudget {
  if (!Number.isFinite(grant.amountUsd) || grant.amountUsd <= 0) {
    throw new Error("Credit grant amount must be positive.");
  }

  return {
    maxBudget: grant.amountUsd,
    budgetDuration
  };
}

export function createSpendLedgerEntry(input: {
  userId: string;
  spendUsd: number;
  externalId: string;
  createdAt: string;
}): CreditLedgerEntry {
  if (!Number.isFinite(input.spendUsd) || input.spendUsd < 0) {
    throw new Error("LiteLLM spend must be a non-negative number.");
  }

  return {
    userId: input.userId,
    amountUsd: -input.spendUsd,
    source: "litellm_spend",
    externalId: input.externalId,
    createdAt: input.createdAt
  };
}
