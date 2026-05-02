# LiteLLM Compatibility

This table tracks the LiteLLM version range verified with ModelDock.

| ModelDock version | LiteLLM image | Status | Notes |
| --- | --- | --- | --- |
| unreleased | `ghcr.io/berriai/litellm:v1.57.8` | Scaffold only | Compose config includes LiteLLM; real API integration tests are planned. |

## Next verification steps

- Add mock tests for user creation, virtual key generation, budgets, model allowlists, and spend tracking.
- Add optional live integration tests guarded by environment variables.
- Fail closed when budget enforcement status is unknown.

Last updated: 2026-05-02
