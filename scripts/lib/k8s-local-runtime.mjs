import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  binaries,
  deploymentNames,
  images,
  repoRoot,
  statefulSetNames,
} from "./k8s-local-config.mjs";

export function printStep(message) {
  console.log(`\n==> ${message}`);
}

export function run(config, command, commandArgs, options = {}) {
  if (config.dryRun) {
    console.log(`$ ${[command, ...commandArgs].join(" ")}`);
    return "";
  }

  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: options.encoding ?? "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${commandArgs.join(" ")} failed with exit code ${result.status}`,
    );
  }

  return options.capture ? result.stdout.trim() : "";
}

function checkBinary(config, binary) {
  if (config.dryRun) {
    return;
  }

  const result = spawnSync("which", [binary], {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    throw new Error(`${binary} is required but was not found in PATH`);
  }
}

export function checkPrerequisites(config, includeDocker) {
  checkBinary(config, binaries.helm);
  checkBinary(config, binaries.kubectl);
  if (!config.skipPortForward) {
    checkBinary(config, binaries.lsof);
  }
  if (includeDocker && !config.skipBuild) {
    checkBinary(config, binaries.docker);
  }
}

export function checkImagesOrBuild(config) {
  if (config.skipBuild) {
    return;
  }

  const missing = images.filter((image) => !localImageExists(config, image.tag));
  if (missing.length === 0) {
    console.log("Local ModelDock images already exist.");
    return;
  }

  console.log(
    `Missing local image(s): ${missing.map((image) => image.tag).join(", ")}`,
  );
  buildImages(config);
}

function localImageExists(config, tag) {
  if (config.dryRun) {
    return false;
  }

  const output = run(config, binaries.docker, ["image", "ls", "-q", tag], {
    capture: true,
  });
  return output.length > 0;
}

export function assertLocalMutationAllowed(config) {
  if (config.dryRun || config.allowNonLocalK8s) {
    if (config.allowNonLocalK8s) {
      console.warn("MODELDOCK_ALLOW_NONLOCAL_K8S=1 is set; local safety gate bypassed.");
    }
    return;
  }

  assertAllowedContext(config);
  assertDebugValuesFile(config);
}

function assertAllowedContext(config) {
  const currentContext = run(
    config,
    binaries.kubectl,
    ["config", "current-context"],
    { capture: true },
  );
  const allowedPattern = new RegExp(config.allowedContextPattern);

  if (!allowedPattern.test(currentContext)) {
    throw new Error(
      `Refusing to mutate Kubernetes context "${currentContext}". ` +
        `This local helper only allows contexts matching /${config.allowedContextPattern}/ by default. ` +
        "Set MODELDOCK_ALLOWED_K8S_CONTEXT_PATTERN or MODELDOCK_ALLOW_NONLOCAL_K8S=1 only when you understand the target cluster.",
    );
  }
}

function assertDebugValuesFile(config) {
  const valuesPath = path.isAbsolute(config.valuesFile)
    ? config.valuesFile
    : path.join(repoRoot, config.valuesFile);
  const values = readFileSync(valuesPath, "utf8");
  const hasDebugProductionFlag =
    /^global:\s*\n(?:[ \t]+[^\n]*\n)*[ \t]+production:\s*false\s*(?:#.*)?$/m.test(
      values,
    );

  if (!hasDebugProductionFlag) {
    throw new Error(
      `Refusing to mutate Kubernetes with non-debug values file ${config.valuesFile}. ` +
        "The selected values must set global.production: false, or you must explicitly set MODELDOCK_ALLOW_NONLOCAL_K8S=1.",
    );
  }
}

export function buildImages(config) {
  if (config.skipBuild) {
    console.log("Skipping Docker image builds because MODELDOCK_SKIP_BUILD=1");
    return;
  }

  printStep("Building local ModelDock images");
  for (const image of images) {
    run(config, binaries.docker, [
      "build",
      "-f",
      "docker/node-app.Dockerfile",
      "--build-arg",
      `APP_PATH=${image.appPath}`,
      "-t",
      image.tag,
      ".",
    ]);
  }
}

export function helmUpgrade(config) {
  printStep("Applying Helm release");
  run(config, binaries.helm, [
    "upgrade",
    "--install",
    config.release,
    config.chartDir,
    "--namespace",
    config.namespace,
    "--create-namespace",
    "-f",
    config.valuesFile,
  ]);
}

function resourceExists(config, kind, name) {
  if (config.dryRun) {
    return true;
  }

  const output = run(
    config,
    binaries.kubectl,
    ["-n", config.namespace, "get", kind, name, "--ignore-not-found", "-o", "name"],
    { capture: true },
  );
  return output.length > 0;
}

function waitForRollout(config, kind, name) {
  if (!resourceExists(config, kind, name)) {
    console.log(`Skipping missing ${kind}/${name}`);
    return;
  }

  run(config, binaries.kubectl, [
    "-n",
    config.namespace,
    "rollout",
    "status",
    `${kind}/${name}`,
    `--timeout=${config.timeout}`,
  ]);
}

export function waitForAllRollouts(config) {
  printStep("Waiting for deployments");
  for (const deployment of deploymentNames(config.fullName)) {
    waitForRollout(config, "deployment", deployment.resource);
  }

  printStep("Waiting for all-in-one stateful workloads");
  for (const statefulSet of statefulSetNames(config.fullName)) {
    waitForRollout(config, "statefulset", statefulSet.resource);
  }
}

export function scalePodsToLocalReplicas(config) {
  printStep(`Scaling ModelDock pods to ${config.localReplicas} replica(s)`);
  for (const deployment of deploymentNames(config.fullName)) {
    scaleResource(config, "deployment", deployment.resource, config.localReplicas);
  }
  for (const statefulSet of statefulSetNames(config.fullName)) {
    scaleResource(config, "statefulset", statefulSet.resource, config.localReplicas);
  }
}

export function restartDeployments(config) {
  printStep("Restarting deployments for local image and config refresh");
  for (const deployment of deploymentNames(config.fullName)) {
    if (!resourceExists(config, "deployment", deployment.resource)) {
      console.log(`Skipping missing deployment/${deployment.resource}`);
      continue;
    }

    run(config, binaries.kubectl, [
      "-n",
      config.namespace,
      "rollout",
      "restart",
      `deployment/${deployment.resource}`,
    ]);
  }
}

export function scalePodsToZero(config) {
  printStep("Scaling ModelDock pods to zero");
  for (const deployment of deploymentNames(config.fullName)) {
    scaleResourceToZero(config, "deployment", deployment.resource);
  }
  for (const statefulSet of statefulSetNames(config.fullName)) {
    scaleResourceToZero(config, "statefulset", statefulSet.resource);
  }
}

function scaleResourceToZero(config, kind, name) {
  scaleResource(config, kind, name, "0");
}

function scaleResource(config, kind, name, replicas) {
  if (!resourceExists(config, kind, name)) {
    console.log(`Skipping missing ${kind}/${name}`);
    return;
  }

  run(config, binaries.kubectl, [
    "-n",
    config.namespace,
    "scale",
    `${kind}/${name}`,
    `--replicas=${replicas}`,
  ]);
}

export function showKubeStatus(config) {
  printStep("Kubernetes resources");
  run(config, binaries.kubectl, [
    "-n",
    config.namespace,
    "get",
    "pods,svc",
    "-o",
    "wide",
  ]);
}
