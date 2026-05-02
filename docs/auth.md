# Authentication and Owner Bootstrap

ModelDock will use secure sessions, role checks, and a one-time owner bootstrap flow.

## What is this page for?

This page describes the planned Phase 2 authentication baseline.

## Roles

| Role | Description |
| --- | --- |
| owner | Full control, initial bootstrap, system settings |
| admin | User, credit, provider management |
| operator | Limited support and operations visibility |
| user | Own chats, own provider keys, own credits |

## Security caveats

Admin accounts require MFA once auth is implemented. Public self-registration remains disabled unless explicitly enabled.

## Related links

- [Security](security.md)
- [Cloudflare deployment](deployment/cloudflare.md)

Last updated: 2026-05-02
