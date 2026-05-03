# OpenRouter Provider

Use this page when connecting a user-owned OpenRouter API key to ModelDock.

## Setup

1. Create an OpenRouter API key.
2. In ModelDock Provider Settings, choose `OpenRouter`.
3. Paste the key into the provider secret field.
4. Save only after validation succeeds.

## ModelDock Settings

| Field | Value |
| --- | --- |
| Provider | `openrouter` |
| Validation URL | `https://openrouter.ai/api/v1/models` |
| Credential type | Bearer API key |
| LiteLLM route | OpenRouter provider route |

## Security

OpenRouter keys authenticate with Bearer tokens and can be configured with limits. ModelDock still applies its own credential encryption, credit ledger, and LiteLLM budget controls.

Use provider-side limits where available. Rotate exposed keys in OpenRouter, then rotate or delete the matching ModelDock credential.

## Source

- OpenRouter authentication docs: https://openrouter.ai/docs/api-keys

Last updated: 2026-05-03
