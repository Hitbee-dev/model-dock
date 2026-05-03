# OpenAI Provider

Use this page when connecting a user-owned OpenAI API key to ModelDock.

## Setup

1. Create or copy a secret key from the OpenAI API key page.
2. In ModelDock Provider Settings, choose `OpenAI`.
3. Paste the key into the provider secret field.
4. Save only after validation succeeds.

## ModelDock Settings

| Field | Value |
| --- | --- |
| Provider | `openai` |
| Validation URL | `https://api.openai.com/v1/models` |
| Credential type | Bearer API key |
| LiteLLM route | OpenAI provider route |

## Security

OpenAI warns users not to share API keys. ModelDock treats the key as write-only: it validates server-side, encrypts the secret at rest, and returns only a credential reference to the browser.

Rotate or delete the key in OpenAI if it is exposed. Then rotate or delete the matching ModelDock credential.

## Source

- OpenAI Help: https://help.openai.com/en/articles/4936850-how-to-create-and-use-an-api-key

Last updated: 2026-05-03
