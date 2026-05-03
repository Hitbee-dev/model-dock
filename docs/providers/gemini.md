# Google Gemini Provider

Use this page when connecting a user-owned Gemini API key to ModelDock.

## Setup

1. Create or view a Gemini API key in Google AI Studio.
2. In ModelDock Provider Settings, choose `Google Gemini`.
3. Paste the key into the provider secret field.
4. Save only after validation succeeds.

## ModelDock Settings

| Field | Value |
| --- | --- |
| Provider | `gemini` |
| Validation URL | `https://generativelanguage.googleapis.com/v1beta/models` |
| Credential type | `x-goog-api-key` header |
| LiteLLM route | Gemini provider route |

## Security

Google says Gemini API keys should be treated like passwords and should not be committed to source control or exposed in client-side apps. ModelDock keeps Gemini keys server-side, encrypts them at rest, and returns only a credential reference to the browser.

Restrict keys in Google Cloud where possible. Rotate or delete exposed keys in Google, then rotate or delete the matching ModelDock credential.

## Source

- Google AI for Developers: https://ai.google.dev/gemini-api/docs/api-key

Last updated: 2026-05-03
