export * from "./cloudflare-access.js";
export * from "./password.js";
export * from "./session.js";

export type ModelDockRole = "owner" | "admin" | "operator" | "user";

export const adminRoles = ["owner", "admin"] as const;

export const modelDockRoles: readonly ModelDockRole[] = ["owner", "admin", "operator", "user"];

export function canAccessAdmin(role: ModelDockRole): boolean {
  return role === "owner" || role === "admin";
}

export type OwnerBootstrapState = {
  ownerExists: boolean;
  bootstrapTokenHash?: string;
};

export function canBootstrapOwner(input: {
  state: OwnerBootstrapState;
  providedTokenHash: string;
}): boolean {
  if (input.state.ownerExists) {
    return false;
  }

  return Boolean(input.state.bootstrapTokenHash && input.state.bootstrapTokenHash === input.providedTokenHash);
}

export function assertRole(value: string): ModelDockRole {
  if (!modelDockRoles.includes(value as ModelDockRole)) {
    throw new Error("Unknown ModelDock role.");
  }

  return value as ModelDockRole;
}

export type PendingRegistration = {
  id: string;
  email: string;
  displayName?: string;
  status: "pending_approval";
  requestedAt: string;
};

export type ApprovedRegistration = Omit<PendingRegistration, "status"> & {
  status: "active";
  approvedAt: string;
  approvedBy: string;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createPendingRegistration(input: {
  email: string;
  displayName?: string;
  now: string;
  id: string;
}): PendingRegistration {
  const email = normalizeEmail(input.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("A valid email address is required.");
  }

  return {
    id: input.id,
    email,
    displayName: input.displayName?.trim() || undefined,
    status: "pending_approval",
    requestedAt: input.now
  };
}

export function approveRegistration(
  registration: PendingRegistration,
  input: { approvedBy: string; now: string }
): ApprovedRegistration {
  return {
    ...registration,
    status: "active",
    approvedAt: input.now,
    approvedBy: input.approvedBy
  };
}
