import { spawn, spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  binaries,
  portForwardTargets,
  repoRoot,
} from "./k8s-local-config.mjs";
import { printStep } from "./k8s-local-runtime.mjs";

function pidPath(config, name) {
  return path.join(config.runtimeDir, `${name}.pid`);
}

function logPath(config, name, stream) {
  return path.join(config.runtimeDir, `${name}.${stream}.log`);
}

function readPid(config, name) {
  const file = pidPath(config, name);
  if (!existsSync(file)) {
    return null;
  }

  assertTrustedPidFile(file);

  const value = Number.parseInt(readFileSync(file, "utf8").trim(), 10);
  return Number.isFinite(value) ? value : null;
}

function assertTrustedPidFile(file) {
  if (typeof process.getuid !== "function") {
    return;
  }

  const stats = statSync(file);
  if (stats.uid !== process.getuid()) {
    throw new Error(`Refusing untrusted pid file owned by another user: ${file}`);
  }
}

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stopPid(pid) {
  if (!isKubectlPortForward(pid)) {
    console.log(`Refusing to stop pid ${pid}; it is not a kubectl port-forward`);
    return;
  }

  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      return;
    }
  }
}

function isKubectlPortForward(pid) {
  const result = spawnSync("ps", ["-p", String(pid), "-o", "command="], {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    return false;
  }

  const command = result.stdout.trim();
  return command.includes("kubectl") && command.includes("port-forward");
}

function waitForProcessExit(pid, timeoutMs = 2500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!isRunning(pid)) {
      return true;
    }
    sleep(100);
  }
  return !isRunning(pid);
}

function waitForPortClear(config, port, timeoutMs = 2500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!portOwner(config, port)) {
      return true;
    }
    sleep(100);
  }
  return !portOwner(config, port);
}

function waitForPortListening(config, port, timeoutMs = 3500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (portOwner(config, port)) {
      return true;
    }
    sleep(100);
  }
  return false;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function stopTrackedPortForwards(config) {
  if (!existsSync(config.runtimeDir)) {
    return;
  }

  printStep("Stopping tracked localhost port-forwards");
  for (const fileName of readdirSync(config.runtimeDir)) {
    if (!fileName.endsWith(".pid")) {
      continue;
    }

    const name = fileName.replace(/\.pid$/, "");
    const pid = readPid(config, name);
    if (config.dryRun) {
      console.log(pid ? `$ kill -TERM -${pid}` : `Skipping stale ${fileName}`);
      continue;
    }

    if (pid && isRunning(pid)) {
      stopPid(pid);
      console.log(`Stopped ${name} port-forward pid ${pid}`);
    }
    rmSync(pidPath(config, name), { force: true });
  }
}

function portOwner(config, port) {
  if (config.dryRun) {
    return "";
  }

  const result = spawnSync(
    binaries.lsof,
    [`-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
    { encoding: "utf8", stdio: "pipe" },
  );
  return result.status === 0 ? result.stdout.trim() : "";
}

export function startPortForwards(config) {
  if (config.skipPortForward) {
    console.log("Skipping port-forwards because MODELDOCK_SKIP_PORT_FORWARD=1");
    return;
  }

  printStep("Starting localhost port-forwards");
  if (config.dryRun) {
    for (const target of portForwardTargets(config.fullName)) {
      console.log(
        `$ ${binaries.kubectl} -n ${config.namespace} port-forward svc/${target.service} ${target.localPort}:${target.remotePort}`,
      );
    }
    return;
  }

  mkdirSync(config.runtimeDir, { recursive: true, mode: 0o700 });

  for (const target of portForwardTargets(config.fullName)) {
    const existingPid = readPid(config, target.name);
    if (existingPid && isRunning(existingPid)) {
      stopPid(existingPid);
      waitForProcessExit(existingPid);
      waitForPortClear(config, target.localPort);
    }

    const owner = portOwner(config, target.localPort);
    if (owner) {
      console.log(
        `Port ${target.localPort} is already in use by pid ${owner}; leaving it unchanged`,
      );
      continue;
    }

    spawnPortForward(config, target);
  }
}

function spawnPortForward(config, target) {
  const stdout = openSync(logPath(config, target.name, "out"), "a");
  const stderr = openSync(logPath(config, target.name, "err"), "a");
  const child = spawn(
    binaries.kubectl,
    [
      "-n",
      config.namespace,
      "port-forward",
      `svc/${target.service}`,
      `${target.localPort}:${target.remotePort}`,
    ],
    { cwd: repoRoot, detached: true, stdio: ["ignore", stdout, stderr] },
  );
  child.unref();
  closeSync(stdout);
  closeSync(stderr);
  writeFileSync(pidPath(config, target.name), `${child.pid}\n`, { mode: 0o600 });
  if (!waitForPortListening(config, target.localPort)) {
    rmSync(pidPath(config, target.name), { force: true });
    throw new Error(
      `Timed out waiting for ${target.name} port-forward on 127.0.0.1:${target.localPort}. Check ${logPath(config, target.name, "err")}.`,
    );
  }

  console.log(
    `${target.name}: http://127.0.0.1:${target.localPort} -> svc/${target.service}:${target.remotePort}`,
  );
}

export function showTrackedPortForwards(config) {
  printStep("Tracked localhost port-forwards");
  if (!existsSync(config.runtimeDir)) {
    console.log("No tracked port-forwards.");
    return;
  }

  for (const target of portForwardTargets(config.fullName)) {
    const pid = readPid(config, target.name);
    const state = pid && isRunning(pid) ? `running pid ${pid}` : "not running";
    console.log(`${target.name}: ${state}`);
  }
}
