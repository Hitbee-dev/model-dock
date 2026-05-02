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

export type RegistrationStore = {
  submit(input: { email: string; displayName?: string }): PendingRegistration;
  listPending(): PendingRegistration[];
  approve(id: string, approvedBy: string): ApprovedRegistration;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createPendingRegistration(input: {
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

function approveRegistration(
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

export function createMemoryRegistrationStore(now = () => new Date().toISOString()): RegistrationStore {
  const pending = new Map<string, PendingRegistration>();

  return {
    submit(input) {
      const id = `reg_${crypto.randomUUID()}`;
      const registration = createPendingRegistration({ ...input, id, now: now() });
      pending.set(id, registration);
      return registration;
    },
    listPending() {
      return [...pending.values()].sort((left, right) => left.requestedAt.localeCompare(right.requestedAt));
    },
    approve(id, approvedBy) {
      const registration = pending.get(id);
      if (!registration) {
        throw new Error("Registration request was not found.");
      }

      pending.delete(id);
      return approveRegistration(registration, { approvedBy, now: now() });
    }
  };
}
