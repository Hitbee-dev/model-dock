# ModelDock Helm Chart

This chart is the initial Kubernetes deployment scaffold for ModelDock.

## Install

Render the chart before installing:

```bash
helm template modeldock ./charts/modeldock
```

Install into a dedicated namespace:

```bash
helm upgrade --install modeldock ./charts/modeldock \
  --namespace modeldock \
  --create-namespace
```

## Secure defaults

- Services are `ClusterIP` by default.
- Ingress is disabled by default.
- LiteLLM has no ingress template and should stay internal.
- Production mode fails if built-in secrets still use placeholders.
- Admin should be exposed only on a separate protected hostname.

## Production values

For production, create a private values file:

```yaml
global:
  production: true

secrets:
  existingSecret: modeldock-secrets

ingress:
  enabled: true
  className: cloudflare
```

The `existingSecret` should contain the keys listed in `templates/secret.yaml`.
Do not commit real values files.
