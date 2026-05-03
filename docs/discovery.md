# Discovery and Indexing

This checklist covers public documentation discovery for ModelDock.

## Public files

Serve these files from the public docs origin:

- `/robots.txt`
- `/sitemap.xml`
- `/llms.txt`
- `/llms-full.txt`

The public docs origin should not require login. Private app, admin, dashboard, API, billing, settings, and internal routes must require authentication regardless of crawler rules.

## Search console submission

After the production docs domain is live:

1. Verify the domain in Google Search Console.
2. Submit `https://modeldock.example.com/sitemap.xml`.
3. Verify the domain in Bing Webmaster Tools.
4. Submit `https://modeldock.example.com/sitemap.xml`.
5. Inspect the homepage and key docs URLs.
6. Confirm that docs pages return `200` and private app/admin pages are authenticated.
7. Re-submit the sitemap after release docs, canonical URLs, or route structure changes.

Replace `modeldock.example.com` with the actual public docs domain before submission.

## AI retrieval visibility

Keep public documentation crawlable if AI retrieval visibility is desired. Do not block public docs with `noindex`, `nosnippet`, authentication, or a managed crawler policy that conflicts with the intended audience.

Crawler files are not access controls. Never rely on `robots.txt` to protect private data.

## Metadata review

Before launch, verify:

- Canonical URLs use the real production docs origin.
- OpenGraph images render from public URLs.
- JSON-LD describes public docs only.
- The sitemap contains no private app, admin, API, dashboard, billing, or settings URLs.
- The docs site does not publish secrets, tokens, private work notes, or local agent state.

Last updated: 2026-05-03
