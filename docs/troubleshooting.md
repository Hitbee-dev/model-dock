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

Last updated: 2026-05-02
