# LiteLLM Integration

LiteLLM is required infrastructure for ModelDock and is not optional decoration.

## What is LiteLLM in ModelDock?

LiteLLM is the model gateway that handles OpenAI-compatible routing, provider abstraction, virtual keys, budgets, spend tracking, and supported rate limits. ModelDock wraps it with signup, BYOK, credits, admin workflows, and chat UI.

## Who is this for?

Use this page when implementing gateway behavior, provider routes, budgets, or spend reconciliation.

## Implementation boundary

Keep LiteLLM code in `packages/litellm`.

`@modeldock/litellm` is the isolation package for LiteLLM API calls and config rendering. Future LiteLLM endpoint changes should be handled there first, with API, web, and admin callers using its stable ModelDock-facing contracts.

Initial responsibilities:

- Render LiteLLM config from ModelDock route records.
- Create LiteLLM users.
- Create virtual keys.
- Map user credits to LiteLLM budgets.
- Enforce model allowlists.
- Sync spend back into the ModelDock ledger.
- Stream authenticated chat completions from LiteLLM to the browser without exposing the LiteLLM master key.

The initial spend sync contract reads LiteLLM `/spend/logs`, normalizes rows into ledger-safe records, and drops prompt, response, hashed-key, and secret-bearing fields before callers receive the result.

## Current admin surface

The admin home is intended to become the primary LiteLLM operations wrapper for
ModelDock. It now reads the configured LiteLLM gateway health, shows users,
pending approvals, credit balances, and ModelDock-side LiteLLM budget mappings.

Credit grants are persisted in the ModelDock ledger, mirrored to the local
LiteLLM budget mapping, and then sent through a server-only LiteLLM user budget
update call. The admin API reports `synced`, `not_configured`, or `failed`
without returning the master key or any virtual key material to the browser.

## Security caveats

Never expose the LiteLLM master key to browsers. Do not expose LiteLLM Admin UI publicly by default.

Chat streaming must be server-mediated. The API authenticates the user session, sends the server-only LiteLLM key upstream, parses OpenAI-compatible SSE frames, drops raw reasoning fields, and emits safe browser SSE events.

## Related links

- [Compatibility](litellm/compatibility.md)
- [Credits](credits.md)
- [Security](security.md)

Last updated: 2026-05-04
