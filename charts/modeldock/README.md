# ModelDock Helm Chart

This chart is the initial Kubernetes deployment scaffold for ModelDock.

## Install

Render the chart before installing:

```bash
helm template modeldock ./charts/modeldock
```

The default values are a safe scaffold: internal dependency URLs are empty
unless you enable `allInOne` or provide external service URLs through
`secrets` and `config`. Install with either the OrbStack all-in-one values
below or a private operator-owned values file:

```bash
helm upgrade --install modeldock ./charts/modeldock \
  --namespace modeldock \
  --create-namespace \
  -f examples/kubernetes/orbstack-values.yaml
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

## OrbStack all-in-one local install

OrbStack's Kubernetes context can run the full local stack with Postgres,
Redis, Weaviate, S3-compatible object storage, LiteLLM, web, admin, and API.
Build the local app images first:

```bash
docker build -f docker/node-app.Dockerfile --build-arg APP_PATH=apps/web -t modeldock/web:local .
docker build -f docker/node-app.Dockerfile --build-arg APP_PATH=apps/admin -t modeldock/admin:local .
docker build -f docker/node-app.Dockerfile --build-arg APP_PATH=apps/api -t modeldock/api:local .
```

Install into OrbStack:

```bash
kubectl config use-context orbstack
helm upgrade --install modeldock ./charts/modeldock \
  --namespace modeldock \
  --create-namespace \
  -f examples/kubernetes/orbstack-values.yaml
```

Open services through localhost port-forwarding:

```bash
kubectl -n modeldock port-forward svc/modeldock-modeldock-web 3000:3000
kubectl -n modeldock port-forward svc/modeldock-modeldock-admin 3001:3001
kubectl -n modeldock port-forward svc/modeldock-modeldock-api 3002:3002
```

The OrbStack values file enables subscription OAuth feature flags only for
local development. Subscription adapters must remain per-user, experimental,
and disabled in production unless the operator intentionally enables them.

The local app image is intentionally simple and copies the workspace build
output for fast local iteration. Use a pruned production image before exposing
the deployment beyond localhost.
