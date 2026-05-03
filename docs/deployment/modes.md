# Debug and Release Modes

ModelDock has two deployment modes because local testing and public service
operation have different security needs.

## Debug mode

Use debug mode for localhost and single-device testing.

```env
MODELDOCK_ACCESS_MODE=debug
MODELDOCK_DEBUG_ADMIN_EMAIL=admin
MODELDOCK_DEBUG_ADMIN_PASSWORD=admin
```

Debug mode behavior:

- Web, admin, and API are expected to bind to localhost.
- The first local owner account is seeded as `admin/admin` when no active owner
  or admin exists.
- The first successful admin login is marked `mustChangePassword=true` and the
  admin app redirects to `/setup-account`.
- The account setup page can be cancelled. Cancelling keeps the default
  credentials active, so it is only acceptable for short-lived local testing.
- If no explicit admin allowlist is configured, the admin app allows loopback.
- Set `ADMIN_AUTO_ALLOW_HOST_NETWORK=true` only for short local LAN testing if
  you want to also allow the service host's detected local IP addresses and
  network interface identifiers.
- Admin access is granted when either an allowed IP address or an allowed device
  fingerprint matches.

## Release mode

Use release mode for any environment connected to a real domain.

```env
MODELDOCK_ACCESS_MODE=release
MODELDOCK_DEBUG_ADMIN_EMAIL=
MODELDOCK_DEBUG_ADMIN_PASSWORD=
ADMIN_ALLOWED_IPS=203.0.113.10
ADMIN_ALLOWED_MACS=
TRUSTED_PROXY_IPS=10.0.0.10
```

Release mode behavior:

- The debug `admin/admin` account is not seeded.
- Empty admin allowlists fail closed.
- Forwarded IP and device headers are ignored unless the request comes from a
  configured trusted proxy IP.
- Services should stay as Kubernetes `ClusterIP` workloads unless explicitly
  exposed by ingress.
- Only the user-facing public surface should be exposed first.
- The admin app must use a separate hostname and an identity-aware gate such as
  Cloudflare Access before it is reachable from the internet.

## MAC address limitation

Browsers and ordinary HTTP reverse proxies cannot reliably provide a client
device's physical MAC address. ModelDock therefore treats MAC entries as
operator-managed device fingerprints. In debug mode, local loopback tests may
provide `x-modeldock-device-mac`; in release mode, device headers are trusted
only from `TRUSTED_PROXY_IPS`. Use IP allowlists, Cloudflare Access, MFA, and
application role checks as the enforceable gates.

## Localization

ModelDock resolves page language in this order:

1. Cloudflare `CF-IPCountry` header when present.
2. `Accept-Language` browser preferences.
3. English fallback.

Current localized UI languages match the README set:

- English
- Korean
- Chinese
- Japanese
- Spanish
- Vietnamese
- Portuguese

Last updated: 2026-05-03
