# Anthropic Provider

Use this page when connecting a user-owned Anthropic API key to ModelDock.

## Setup

1. Create or copy an API key from the Anthropic Console.
2. In ModelDock Provider Settings, choose `Anthropic`.
3. Paste the key into the provider secret field.
4. Save only after validation succeeds.

## ModelDock Settings

| Field | Value |
| --- | --- |
| Provider | `anthropic` |
| Validation URL | `https://api.anthropic.com/v1/models` |
| Credential type | `x-api-key` header |
| LiteLLM route | Anthropic provider route |

## Security

Anthropic API keys authenticate API requests. ModelDock stores the key as an encrypted write-only credential and never returns it to the browser after save.

Rotate or archive exposed keys in Anthropic, then rotate or delete the matching ModelDock credential.

## Source

- Anthropic API key docs: https://docs.anthropic.com/en/api/admin-api/apikeys/get-api-key

Last updated: 2026-05-03
