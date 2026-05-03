# @modeldock/litellm

LiteLLM integration boundary for ModelDock.

Keep LiteLLM client calls, route configuration rendering, virtual key helpers, budget mapping, and compatibility behavior in this package.

## Integration tests

The default test suite uses a mock LiteLLM fetch adapter, so it does not require network access or real secrets.

Live LiteLLM smoke tests are opt-in:

```bash
MODELDOCK_LITELLM_LIVE_TESTS=true \
LITELLM_BASE_URL=https://litellm.example.com \
LITELLM_MASTER_KEY=replace-with-real-server-only-key \
pnpm --filter @modeldock/litellm test
```

Keep live tests disabled in CI unless the environment provides a private LiteLLM proxy and a server-only master key.
