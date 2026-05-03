import type { IncomingMessage } from "node:http";
import { networkInterfaces } from "node:os";

export type AdminAccessMode = "debug" | "release";

export type AccessRuleSnapshot = {
  mode: AdminAccessMode;
  allowedIps: string[];
  allowedMacs: string[];
  detectedIps: string[];
  detectedMacs: string[];
  trustedProxyIps: string[];
};

export type AdminAccessGate = {
  isAllowed(request: IncomingMessage): boolean;
  addRule(input: { kind: "ip" | "mac"; value: string }): void;
  deleteRule(input: { kind: "ip" | "mac"; value: string }): void;
  snapshot(): AccessRuleSnapshot;
};

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeIp(value: string): string {
  if (value.startsWith("::ffff:")) {
    return value.slice("::ffff:".length);
  }
  return value;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isLoopback(value: string): boolean {
  const ip = normalizeIp(value);
  return ip === "127.0.0.1" || ip === "::1";
}

function normalizeMac(value: string): string {
  return value.trim().toLowerCase().replaceAll("-", ":");
}

function detectedNetworkRules() {
  const ips = new Set(["127.0.0.1", "::1"]);
  const macs = new Set<string>();

  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (!entry.internal && entry.address) {
        ips.add(normalizeIp(entry.address));
      }
      if (entry.mac && entry.mac !== "00:00:00:00:00:00") {
        macs.add(normalizeMac(entry.mac));
      }
    }
  }

  return { ips: [...ips], macs: [...macs] };
}

function requestIp(request: IncomingMessage, input: { mode: AdminAccessMode; trustedProxyIps: Set<string> }): string {
  const remote = normalizeIp(request.socket.remoteAddress ?? "");
  const canTrustForwardedHeaders = input.trustedProxyIps.has(remote) || (input.mode === "debug" && isLoopback(remote));
  if (!canTrustForwardedHeaders) {
    return remote;
  }

  const forwarded = headerValue(request.headers["x-forwarded-for"])?.split(",")[0]?.trim();
  return normalizeIp(headerValue(request.headers["cf-connecting-ip"]) ?? forwarded ?? remote);
}

function requestDeviceMac(
  request: IncomingMessage,
  input: { mode: AdminAccessMode; trustedProxyIps: Set<string> }
): string | undefined {
  const remote = normalizeIp(request.socket.remoteAddress ?? "");
  const canTrustDeviceHeader = input.trustedProxyIps.has(remote) || (input.mode === "debug" && isLoopback(remote));
  if (!canTrustDeviceHeader) {
    return undefined;
  }

  const raw = headerValue(request.headers["x-modeldock-device-mac"]);
  return raw ? normalizeMac(raw) : undefined;
}

export function createAdminAccessGate(input: {
  allowedIps?: string;
  allowedMacs?: string;
  autoAllowHostNetwork?: boolean;
  mode?: string;
  trustedProxyIps?: string;
}): AdminAccessGate {
  const mode: AdminAccessMode = input.mode === "release" ? "release" : "debug";
  const detected = detectedNetworkRules();
  const allowedIps = new Set(splitList(input.allowedIps).map(normalizeIp));
  const allowedMacs = new Set(splitList(input.allowedMacs).map(normalizeMac));
  const trustedProxyIps = new Set(splitList(input.trustedProxyIps).map(normalizeIp));

  if (mode === "debug" && allowedIps.size === 0 && allowedMacs.size === 0) {
    allowedIps.add("127.0.0.1");
    allowedIps.add("::1");
  }

  if (mode === "debug" && input.autoAllowHostNetwork) {
    for (const ip of detected.ips) {
      allowedIps.add(ip);
    }
    for (const mac of detected.macs) {
      allowedMacs.add(mac);
    }
  }

  return {
    isAllowed(request) {
      const ip = requestIp(request, { mode, trustedProxyIps });
      const mac = requestDeviceMac(request, { mode, trustedProxyIps });
      return allowedIps.has(ip) || Boolean(mac && allowedMacs.has(mac));
    },
    addRule(input) {
      if (input.kind === "ip") {
        allowedIps.add(normalizeIp(input.value));
      } else {
        allowedMacs.add(normalizeMac(input.value));
      }
    },
    deleteRule(input) {
      if (input.kind === "ip") {
        allowedIps.delete(normalizeIp(input.value));
      } else {
        allowedMacs.delete(normalizeMac(input.value));
      }
    },
    snapshot() {
      return {
        mode,
        allowedIps: [...allowedIps].sort(),
        allowedMacs: [...allowedMacs].sort(),
        detectedIps: detected.ips.sort(),
        detectedMacs: detected.macs.sort(),
        trustedProxyIps: [...trustedProxyIps].sort()
      };
    }
  };
}
