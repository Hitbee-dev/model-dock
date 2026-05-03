# Kubernetes Deployment

ModelDock includes an initial Helm chart under `charts/modeldock`.

## What is this page for?

This page explains the Kubernetes baseline and the remaining hardening work before a production cluster install.

## Render locally

```bash
helm template modeldock ./charts/modeldock
```

## Install scaffold

```bash
helm upgrade --install modeldock ./charts/modeldock \
  --namespace modeldock \
  --create-namespace \
  -f examples/kubernetes/orbstack-values.yaml
```

The no-values chart is renderable for review, but it intentionally leaves
external dependency URLs empty unless `allInOne` is enabled or a private values
file supplies managed Postgres, Redis, Weaviate, object storage, and secrets.

## OrbStack all-in-one localhost setup

Use OrbStack when you want a single-node Kubernetes environment on your Mac
without minikube. The chart can create local Postgres, Redis, Weaviate, and an
S3-compatible object store alongside ModelDock and LiteLLM.

Prerequisites:

```bash
kubectl config use-context orbstack
kubectl get nodes
```

Build local app images into OrbStack's Docker engine:

```bash
docker build -f docker/node-app.Dockerfile --build-arg APP_PATH=apps/web -t modeldock/web:local .
docker build -f docker/node-app.Dockerfile --build-arg APP_PATH=apps/admin -t modeldock/admin:local .
docker build -f docker/node-app.Dockerfile --build-arg APP_PATH=apps/api -t modeldock/api:local .
```

Install:

```bash
helm upgrade --install modeldock ./charts/modeldock \
  --namespace modeldock \
  --create-namespace \
  -f examples/kubernetes/orbstack-values.yaml
```

Check rollout:

```bash
kubectl -n modeldock get pods
kubectl -n modeldock rollout status deployment/modeldock-modeldock-web
kubectl -n modeldock rollout status deployment/modeldock-modeldock-admin
kubectl -n modeldock rollout status deployment/modeldock-modeldock-api
kubectl -n modeldock rollout status deployment/modeldock-modeldock-litellm
```

Use separate terminal panes for localhost access:

```bash
kubectl -n modeldock port-forward svc/modeldock-modeldock-web 3000:3000
kubectl -n modeldock port-forward svc/modeldock-modeldock-admin 3001:3001
kubectl -n modeldock port-forward svc/modeldock-modeldock-api 3002:3002
```

Then open:

- User app: `http://127.0.0.1:3000`
- Admin app: `http://127.0.0.1:3001`
- API health: `http://127.0.0.1:3002/healthz`

The local values file enables experimental subscription OAuth flags so the UI
and config path can be exercised without provider API keys. These adapters are
not a production promise: they must stay per-user, provider-terms aware, and
disabled by default for production values.

## Chart structure

- `Chart.yaml`
- `values.yaml`
- `templates/deployments.yaml`
- `templates/all-in-one-services.yaml`
- `templates/all-in-one-workloads.yaml`
- `templates/litellm-deployment.yaml`
- `templates/services.yaml`
- `templates/ingress.yaml`
- `templates/configmap.yaml`
- `templates/secret.yaml`
- `templates/litellm-config.yaml`

## Implemented baseline

- Separate deployments for web, admin, API, and LiteLLM.
- Optional all-in-one StatefulSets for Postgres, Redis, Weaviate, and S3-compatible object storage.
- Separate Postgres databases for the ModelDock control plane and LiteLLM proxy metadata.
- Idempotent LiteLLM database bootstrap for fresh and existing all-in-one Postgres PVCs.
- ClusterIP services by default.
- Ingress disabled by default.
- LiteLLM service remains internal-only.
- LiteLLM uses the official image's root-compatible runtime by default, with
  privilege escalation disabled, Linux capabilities dropped, and no public
  ingress. Use a custom non-root image if your production policy requires it.
- All-in-one dependencies keep `ClusterIP` networking. Redis, Weaviate, and
  object storage drop Linux capabilities by default; Postgres keeps its image
  default container permissions so the official entrypoint can manage data
  directory ownership on a fresh PVC.
- Kubernetes Secret template for app/API/LiteLLM secrets.
- `secrets.existingSecret` support for external secret managers.
- `global.production=true` fails if bundled placeholder secrets, localhost URLs, or scaffold URLs remain.
- Local Docker images are optimized for OrbStack iteration. Build pruned runtime images before public production exposure.

## Production requirements

Before production:

1. Use a private values file or `secrets.existingSecret`.
2. Replace every `replace-with-*` value.
3. Keep LiteLLM, database, Redis, Weaviate, and object storage internal.
4. Expose user app, API, and admin through separate hostnames.
5. Protect admin with Cloudflare Access or equivalent identity-aware access.
6. Run `helm template` and review every rendered public endpoint.

## Cloudflare transition

After localhost validation, keep the same chart and add only explicit ingress
values for public surfaces. Do not expose LiteLLM, Postgres, Redis, Weaviate,
or object storage. Admin should use a separate random admin hostname protected
by Cloudflare Access, then still pass ModelDock role checks.

## Remaining hardening

- Add NetworkPolicy templates.
- Add PodDisruptionBudget and autoscaling templates.
- Add migration Job templates.
- Add backup/restore examples for managed databases and object storage.

## Security caveats

Do not expose LiteLLM admin, Postgres, Redis, Weaviate, object storage, or internal APIs directly.

Last updated: 2026-05-03
