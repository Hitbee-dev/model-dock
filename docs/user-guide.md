# User Guide

This guide describes the current user-facing workflow.

## Request access

Open the user app:

```text
http://127.0.0.1:3000
```

Submit a signup request with your email address. ModelDock keeps the request in
`pending_approval` until an administrator approves it.

## Wait for approval

You cannot use the service immediately after requesting access. An owner or
admin must approve your request from the admin console. After approval, the
admin sends a setup link. Open that link and set your password before signing in.

## Provider credentials

ModelDock is designed for user-owned provider credentials. When provider
settings are enabled, connect your own API key or OpenAI-compatible endpoint.

ModelDock must encrypt provider credentials at rest, avoid logging secrets, and
never return stored secrets to the browser after initial save.

## Language

The app chooses a language from Cloudflare country headers or your browser's
language preference. English is used when no supported language matches.

Supported UI languages currently match the README translations:

- English
- Korean
- Chinese
- Japanese
- Spanish
- Vietnamese
- Portuguese

Last updated: 2026-05-03
