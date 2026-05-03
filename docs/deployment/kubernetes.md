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
  --create-namespace
```

## Chart structure

- `Chart.yaml`
- `values.yaml`
- `templates/deployments.yaml`
- `templates/litellm-deployment.yaml`
- `templates/services.yaml`
- `templates/ingress.yaml`
- `templates/configmap.yaml`
- `templates/secret.yaml`
- `templates/litellm-config.yaml`

## Implemented baseline

- Separate deployments for web, admin, API, and LiteLLM.
- ClusterIP services by default.
- Ingress disabled by default.
- LiteLLM service remains internal-only.
- Kubernetes Secret template for app/API/LiteLLM secrets.
- `secrets.existingSecret` support for external secret managers.
- `global.production=true` fails if bundled placeholder secrets remain.

## Production requirements

Before production:

1. Use a private values file or `secrets.existingSecret`.
2. Replace every `replace-with-*` value.
3. Keep LiteLLM, database, Redis, Weaviate, and object storage internal.
4. Expose user app, API, and admin through separate hostnames.
5. Protect admin with Cloudflare Access or equivalent identity-aware access.
6. Run `helm template` and review every rendered public endpoint.

## Remaining hardening

- Add optional dependency charts or documented external service presets.
- Add NetworkPolicy templates.
- Add PodDisruptionBudget and autoscaling templates.
- Add migration Job templates.
- Add backup/restore examples for managed databases and object storage.

## Security caveats

Do not expose LiteLLM admin, Postgres, Redis, Weaviate, object storage, or internal APIs directly.

Last updated: 2026-05-03
