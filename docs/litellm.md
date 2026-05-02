# LiteLLM Integration

LiteLLM is required infrastructure for ModelDock and is not optional decoration.

## What is LiteLLM in ModelDock?

LiteLLM is the model gateway that handles OpenAI-compatible routing, provider abstraction, virtual keys, budgets, spend tracking, and supported rate limits. ModelDock wraps it with signup, BYOK, credits, admin workflows, and chat UI.

## Who is this for?

Use this page when implementing gateway behavior, provider routes, budgets, or spend reconciliation.

## Implementation boundary

Keep LiteLLM code in `packages/litellm`.

Initial responsibilities:

- Render LiteLLM config from ModelDock route records.
- Create LiteLLM users.
- Create virtual keys.
- Map user credits to LiteLLM budgets.
- Enforce model allowlists.
- Sync spend back into the ModelDock ledger.

## Security caveats

Never expose the LiteLLM master key to browsers. Do not expose LiteLLM Admin UI publicly by default.

## Related links

- [Compatibility](litellm/compatibility.md)
- [Credits](credits.md)
- [Security](security.md)

Last updated: 2026-05-02
