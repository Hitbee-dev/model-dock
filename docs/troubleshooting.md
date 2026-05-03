# Troubleshooting

This page collects common ModelDock setup issues.

## Docker Compose config fails

Run:

```bash
docker compose config
```

Check that `.env` does not contain invalid YAML characters and that Docker Compose is installed.

## pnpm install fails

Check network access to the npm registry and the configured pnpm version.

## Production placeholder secret error

Production mode rejects predictable placeholder secrets. Replace every `replace-with-*` value before deployment.

## Admin is reachable from the user hostname

Stop the deployment and check the reverse proxy or tunnel routes. Admin must use a separate protected hostname and still pass application role checks.

## LiteLLM is reachable publicly

Remove the public route immediately. LiteLLM must stay internal unless it is intentionally exposed behind separate administrative access controls.

Last updated: 2026-05-03
