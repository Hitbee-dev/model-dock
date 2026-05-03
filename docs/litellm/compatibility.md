# LiteLLM Compatibility

This table tracks the LiteLLM version range verified with ModelDock.

| ModelDock version | LiteLLM image | Status | Notes |
| --- | --- | --- | --- |
| unreleased | `ghcr.io/berriai/litellm:v1.80.5-stable` | Mock verified, image manifest verified | Compose and Helm config include LiteLLM; mock proxy tests cover provisioning, virtual keys, and spend sync. |

## Next verification steps

- Run optional live integration tests against a private LiteLLM proxy before release.
- Fail closed when budget enforcement status is unknown.

Last updated: 2026-05-03
