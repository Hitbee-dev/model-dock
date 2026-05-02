# BYOK Provider Setup

BYOK means Bring Your Own Key.

## What is BYOK in ModelDock?

Users connect their own provider API keys, such as OpenAI, Anthropic, Gemini, OpenRouter, or a local OpenAI-compatible endpoint. ModelDock stores those credentials securely and uses them only to make model requests on behalf of that user.

## Who is this for?

This page is for users connecting provider credentials and contributors implementing provider workflows.

## Planned flow

1. User opens Provider Settings.
2. User adds a provider key or OpenAI-compatible endpoint.
3. ModelDock validates the connection with a minimal request.
4. The credential is encrypted at rest.
5. The browser receives only a safe credential reference.
6. Requests route through ModelDock and LiteLLM.
7. User can delete or rotate the credential.

## Security caveats

Provider keys must not be logged, returned to the browser after save, or stored in plaintext.

## Related links

- [Security](security.md)
- [LiteLLM integration](litellm.md)

Last updated: 2026-05-02
