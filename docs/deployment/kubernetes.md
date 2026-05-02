# Kubernetes Deployment

Kubernetes and Helm support are planned after the Docker Compose baseline.

## What is this page for?

This page records the exact next steps for the future Helm chart.

## Planned chart structure

```text
charts/modeldock/Chart.yaml
charts/modeldock/values.yaml
charts/modeldock/templates/*
```

## Requirements

- Separate deployments for web, admin, API, and LiteLLM.
- Externalizable Postgres.
- Secrets via Kubernetes Secrets or an external secret manager.
- Ingress examples for Cloudflare.
- Helm upgrade and rollback docs.

## Security caveats

Do not expose LiteLLM admin, Postgres, or internal APIs directly.

Last updated: 2026-05-02
