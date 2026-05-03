# Cloudflare Deployment

Cloudflare can safely expose ModelDock when used as one layer in a broader security design.

## What is this page for?

Use this page to plan a generic Cloudflare deployment without exposing internal services directly.

## Recommended subdomain map

```text
modeldock.example.com                 Public landing page and docs
app.modeldock.example.com             User app
api.modeldock.example.com             Public API
admin-<random>.modeldock.example.com  Admin app protected by Cloudflare Access
status.modeldock.example.com          Optional status page
```

## DNS records

- Point public docs to Cloudflare Pages or another docs host.
- Route app, API, and admin origins through Cloudflare Tunnel.
- Do not create public DNS records for Postgres, Redis, LiteLLM admin, or internal APIs.

## Cloudflare Pages for docs

Serve `robots.txt`, `sitemap.xml`, `llms.txt`, and `llms-full.txt` from stable public URLs. Keep docs crawlable if discoverability is desired.

## Cloudflare Tunnel for app and API

Expose only the intended app, API, and admin HTTP services through named tunnel routes. Keep origins bound to localhost or a private network.

## Cloudflare Access for admin

Protect the randomized admin hostname with Cloudflare Access. Allow only owner/admin identities or a managed group. Require MFA at the identity provider and still enforce application-level admin roles.

When `CLOUDFLARE_ACCESS_ENABLED=true`, ModelDock validates the `Cf-Access-Jwt-Assertion`
header at the API origin. The verifier fetches JWK signing keys from
`https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`, verifies RS256
signatures, and then enforces issuer, audience, expiration, and optional allowed
admin emails. Keep `CLOUDFLARE_ACCESS_ALLOWED_AUDIENCES` scoped to the admin
Access application.

## WAF, rate limiting, and Turnstile

Enable managed WAF rules and rate limits for login, signup, API, chat completions, provider validation, token refresh, and owner bootstrap. Add Turnstile where abuse risk justifies it.

## TLS and origin hardening

Use Full Strict TLS. Restrict direct origin access with firewall rules where possible.

## AI crawler policy

Public docs may allow search and user-triggered AI retrieval bots. Private app, API, admin, dashboard, and settings surfaces must be authenticated and should not be indexed. `robots.txt` is not a security boundary.

## Related links

- [Security](../security.md)
- [Docker deployment](docker.md)

Last updated: 2026-05-02
