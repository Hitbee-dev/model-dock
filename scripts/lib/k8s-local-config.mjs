import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(
  fileURLToPath(new URL("../..", import.meta.url)),
);

export function createConfig(args) {
  const action = args.find((arg) => !arg.startsWith("-")) ?? "help";
  const dryRun = args.includes("--dry-run");

  const config = {
    action,
    dryRun,
    namespace: process.env.MODELDOCK_K8S_NAMESPACE ?? "modeldock",
    release: process.env.MODELDOCK_HELM_RELEASE ?? "modeldock",
    valuesFile:
      process.env.MODELDOCK_HELM_VALUES ??
      "examples/kubernetes/orbstack-values.yaml",
    chartDir: process.env.MODELDOCK_HELM_CHART ?? "charts/modeldock",
    timeout: process.env.MODELDOCK_K8S_TIMEOUT ?? "180s",
    skipBuild: process.env.MODELDOCK_SKIP_BUILD === "1",
    skipPortForward: process.env.MODELDOCK_SKIP_PORT_FORWARD === "1",
    allowNonLocalK8s: process.env.MODELDOCK_ALLOW_NONLOCAL_K8S === "1",
    allowedContextPattern:
      process.env.MODELDOCK_ALLOWED_K8S_CONTEXT_PATTERN ?? "orbstack",
    localReplicas: process.env.MODELDOCK_LOCAL_REPLICAS ?? "1",
  };

  const fullName =
    process.env.MODELDOCK_HELM_FULLNAME ?? `${config.release}-modeldock`;

  return {
    ...config,
    fullName,
    runtimeDir: path.join(
      os.tmpdir(),
      `modeldock-k8s-portforwards-${currentUserId()}`,
      safePathSegment(config.namespace),
      safePathSegment(config.release),
      safePathSegment(fullName),
    ),
  };
}

function safePathSegment(value) {
  return value.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function currentUserId() {
  return typeof process.getuid === "function" ? String(process.getuid()) : "user";
}

export const binaries = {
  docker: process.env.DOCKER_BIN ?? "docker",
  helm: process.env.HELM_BIN ?? "helm",
  kubectl: process.env.KUBECTL_BIN ?? "kubectl",
  lsof: process.env.LSOF_BIN ?? "lsof",
};

export const images = [
  { appPath: "apps/web", tag: "modeldock/web:local" },
  { appPath: "apps/admin", tag: "modeldock/admin:local" },
  { appPath: "apps/api", tag: "modeldock/api:local" },
];

export function deploymentNames(fullName) {
  return ["web", "admin", "api", "litellm"].map((name) => ({
    name,
    resource: `${fullName}-${name}`,
  }));
}

export function statefulSetNames(fullName) {
  return ["postgres", "redis", "weaviate", "objectstore"].map((name) => ({
    name,
    resource: `${fullName}-${name}`,
  }));
}

export function portForwardTargets(fullName) {
  return [
    {
      name: "web",
      service: `${fullName}-web`,
      localPort: 3000,
      remotePort: 3000,
    },
    {
      name: "admin",
      service: `${fullName}-admin`,
      localPort: 3001,
      remotePort: 3001,
    },
    {
      name: "api",
      service: `${fullName}-api`,
      localPort: 3002,
      remotePort: 3002,
    },
  ];
}
