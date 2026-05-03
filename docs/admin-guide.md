# Administrator Guide

This guide covers the current local admin workflow and the production security
shape ModelDock expects.

## First local login

Start in debug mode and open the admin app:

```text
http://127.0.0.1:3001
```

Default debug credentials:

```text
ID or email: admin
Password:    admin
```

After the first successful login, ModelDock redirects to the account setup page.
Set a real admin ID or email and a password with at least 12 characters.

Cancelling the setup returns to the admin console and keeps `admin/admin`
usable. Do this only for short local testing. Before sharing the service with
anyone else, change the default credentials.

## Approval workflow

1. A user submits a signup request from the user app.
2. The request remains pending.
3. An owner or admin opens the admin app.
4. The admin reviews pending registrations.
5. The admin approves the request.
6. The admin app shows a setup link for the approved user.
7. The admin sends that link through a private channel.
8. The user sets a password before the account becomes login-capable.

The API requires the dedicated admin host or admin service proxy, the server
admin token, an authenticated admin session, and CSRF protection for approval
changes.

## Admin access allowlist

Open:

```text
http://127.0.0.1:3001/settings
```

From this page, an admin can add or delete:

- Allowed IP addresses.
- Allowed device fingerprints.

An admin request is allowed when either the request IP or the device fingerprint
matches the allowlist.

In debug mode, ModelDock automatically allows loopback when no explicit
allowlist exists. Set `ADMIN_AUTO_ALLOW_HOST_NETWORK=true` only for short local
LAN testing if you want to also trust the service host's detected local network
addresses. In release mode, empty allowlists fail closed.

Forwarded IP and device headers are trusted only from `TRUSTED_PROXY_IPS`.

Current MVP note: access rules edited in the admin UI are runtime rules. Persist
them through environment variables or a future database-backed settings store
before relying on them for long-running production administration.

## Release checklist

Before connecting a domain:

- Set `MODELDOCK_ACCESS_MODE=release`.
- Remove debug admin credentials.
- Configure non-placeholder session, encryption, LiteLLM, and admin secrets.
- Keep LiteLLM, Postgres, Redis, Weaviate, and object storage internal.
- Expose the user app first.
- Put admin on a separate hostname.
- Protect admin with Cloudflare Access or an equivalent identity-aware proxy.
- Configure `TRUSTED_PROXY_IPS` if Cloudflare Tunnel, ingress, or another
  reverse proxy is expected to provide client IP or device claims.
- Require MFA for admin identities.
- Keep application-level owner/admin role checks enabled.

Last updated: 2026-05-03
