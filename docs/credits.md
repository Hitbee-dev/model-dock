# Credits and Budgets

Credits are ModelDock's user-facing balance; LiteLLM budgets are the enforcement layer.

## What is credit management in ModelDock?

ModelDock keeps a product ledger of grants and usage while LiteLLM enforces gateway budgets and tracks spend.

## Who is this for?

This page is for operators and contributors implementing billing-adjacent usage controls without adding a payment processor.

## Planned mapping

```text
User sees: $5 credit
ModelDock ledger: credit_grant + usage entries
LiteLLM: max_budget=5, budget_duration=30d
```

## Security caveats

Credit controls are not a substitute for provider account limits. Platform-owned keys must also have provider-side limits.

## Related links

- [LiteLLM integration](litellm.md)
- [Security](security.md)

Last updated: 2026-05-02
