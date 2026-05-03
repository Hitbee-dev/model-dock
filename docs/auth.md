# Authentication and Owner Bootstrap

ModelDock uses secure sessions, role checks, approval-gated signup, and a
debug-only first owner bootstrap for local testing.

## What is this page for?

This page describes the current authentication baseline and the production
controls that remain required before public exposure.

## Debug owner bootstrap

In debug mode, the API creates the first local owner as `admin/admin` only when
no active owner or admin exists. The account is marked `mustChangePassword`.

The admin app redirects that account to `/setup-account` after login. Cancelling
the setup is allowed for local testing, but it leaves the default debug
credentials active.

Release mode does not seed `admin/admin`.

## Roles

| Role | Description |
| --- | --- |
| owner | Full control, initial bootstrap, system settings |
| admin | User, credit, provider management |
| operator | Limited support and operations visibility |
| user | Own chats, own provider keys, own credits |

## Security caveats

Admin accounts require MFA before public release. Signup requests are pending
until approved by an owner or admin. The admin API requires the admin host or
debug admin proxy, a server admin token, an authenticated admin session, and
CSRF protection for state-changing actions.

Approving a signup creates a credential setup invitation. The approved user is
not login-capable until they set a password with that setup token.

## Related links

- [Security](security.md)
- [Administrator guide](admin-guide.md)
- [User guide](user-guide.md)
- [Debug and release modes](deployment/modes.md)
- [Cloudflare deployment](deployment/cloudflare.md)

Last updated: 2026-05-03
