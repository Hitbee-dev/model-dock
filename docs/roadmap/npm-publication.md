# npm Publication Status

The initial package manifests were prepared and published for these public packages:

```text
@modeldock/cli
@modeldock/web
@modeldock/api
@modeldock/auth
@modeldock/byok
@modeldock/credits
@modeldock/litellm
@modeldock/ui
```

## Current status

`npm publish --access public` completed for all eight requested packages at version `0.0.0`.

## Published packages

- `@modeldock/cli@0.0.0`
- `@modeldock/web@0.0.0`
- `@modeldock/api@0.0.0`
- `@modeldock/auth@0.0.0`
- `@modeldock/byok@0.0.0`
- `@modeldock/credits@0.0.0`
- `@modeldock/litellm@0.0.0`
- `@modeldock/ui@0.0.0`

## Next release steps

1. Bump package versions before publishing again. npm will reject another publish of `0.0.0`.
2. Replace placeholder package surfaces with real implementation milestones before `0.1.0`.
3. Run the standard release verification before every publish:
   `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and package dry-runs.

Last updated: 2026-05-02
