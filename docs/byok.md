# BYOK Provider Setup

BYOK means Bring Your Own Key.

## What is BYOK in ModelDock?

Users connect their own provider API keys, such as OpenAI, Anthropic, Gemini, OpenRouter, or a local OpenAI-compatible endpoint. ModelDock stores those credentials securely and uses them only to make model requests on behalf of that user.

## Who is this for?

This page is for users connecting provider credentials and contributors implementing provider workflows.

## Flow

1. User opens Provider Settings.
2. User adds a provider key or OpenAI-compatible endpoint.
3. ModelDock validates the connection with a minimal server-side request.
4. The credential is encrypted at rest.
5. The browser receives only a safe credential reference.
6. Requests route through ModelDock and LiteLLM.
7. User can delete or rotate the credential.

## Rotation

Credential rotation replaces the encrypted provider secret while keeping the credential reference stable for chat and routing policies.
Rotation uses fresh IV material, records the new encryption key id and rotation time, and never returns the old or new plaintext key to the browser.

Deleted credentials cannot be rotated. Users must create a new provider credential after deletion.

## Security caveats

Provider keys must not be logged, returned to the browser after save, or stored in plaintext. The browser receives a credential reference, not the plaintext provider key or encrypted ciphertext.

Provider validation is rate-limited and server-mediated. Validation responses contain only success state and upstream HTTP status; they do not echo provider keys.

## Related links

- [Security](security.md)
- [LiteLLM integration](litellm.md)

Last updated: 2026-05-03
