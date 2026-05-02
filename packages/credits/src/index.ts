export type CreditGrant = {
  userId: string;
  amountUsd: number;
  expiresAt?: string;
};

export type LiteLLMBudget = {
  maxBudget: number;
  budgetDuration: string;
};

export function mapCreditsToLiteLLMBudget(grant: CreditGrant, budgetDuration = "30d"): LiteLLMBudget {
  return {
    maxBudget: grant.amountUsd,
    budgetDuration
  };
}
