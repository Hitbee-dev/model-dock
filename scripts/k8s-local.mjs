#!/usr/bin/env node
import { createConfig } from "./lib/k8s-local-config.mjs";
import {
  showTrackedPortForwards,
  startPortForwards,
  stopTrackedPortForwards,
} from "./lib/k8s-local-port-forward.mjs";
import {
  buildImages,
  assertLocalMutationAllowed,
  checkImagesOrBuild,
  checkPrerequisites,
  helmUpgrade,
  restartDeployments,
  scalePodsToZero,
  scalePodsToLocalReplicas,
  waitForAllRollouts,
  showKubeStatus,
} from "./lib/k8s-local-runtime.mjs";

function usage() {
  console.log(`ModelDock local Kubernetes helper

Usage:
  pnpm k8s:start           Install or scale up the OrbStack all-in-one stack
  pnpm k8s:stop            Stop app and dependency pods without deleting PVCs
  pnpm k8s:update          Rebuild local app images and roll deployments
  pnpm k8s:status          Show current pods, services, and tracked forwards

Options:
  --dry-run                Print commands without executing them

Environment:
  MODELDOCK_K8S_NAMESPACE  Kubernetes namespace, default: modeldock
  MODELDOCK_HELM_RELEASE   Helm release name, default: modeldock
  MODELDOCK_HELM_VALUES    Helm values file, default: examples/kubernetes/orbstack-values.yaml
  MODELDOCK_SKIP_BUILD=1   Skip Docker image builds during update
  MODELDOCK_SKIP_PORT_FORWARD=1  Do not start localhost port-forwards
  MODELDOCK_LOCAL_REPLICAS Number of local replicas restored by start/update, default: 1
  MODELDOCK_ALLOW_NONLOCAL_K8S=1  Bypass OrbStack/debug safety gate
`);
}

function start(config) {
  checkPrerequisites(config, true);
  assertLocalMutationAllowed(config);
  checkImagesOrBuild(config);
  helmUpgrade(config);
  scalePodsToLocalReplicas(config);
  waitForAllRollouts(config);
  startPortForwards(config);
}

function stop(config) {
  checkPrerequisites(config, false);
  assertLocalMutationAllowed(config);
  stopTrackedPortForwards(config);
  scalePodsToZero(config);
}

function update(config) {
  checkPrerequisites(config, true);
  assertLocalMutationAllowed(config);
  buildImages(config);
  helmUpgrade(config);
  scalePodsToLocalReplicas(config);
  restartDeployments(config);
  waitForAllRollouts(config);
  startPortForwards(config);
}

const args = process.argv.slice(2);
const config = createConfig(args);

try {
  if (args.includes("--help") || config.action === "help") {
    usage();
  } else if (config.action === "start") {
    start(config);
  } else if (config.action === "stop") {
    stop(config);
  } else if (config.action === "update") {
    update(config);
  } else if (config.action === "status") {
    checkPrerequisites(config, false);
    showKubeStatus(config);
    showTrackedPortForwards(config);
  } else {
    usage();
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
