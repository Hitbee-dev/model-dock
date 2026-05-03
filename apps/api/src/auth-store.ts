import { normalizeEmail, verifyTokenHash, type ModelDockRole, type PasswordHash } from "@modeldock/auth";

export type AuthUser = {
  id: string;
  email: string;
  role: ModelDockRole;
  status: "active";
  passwordHash: PasswordHash;
  mustChangePassword?: boolean;
};

export type AuthSessionRecord = {
  id: string;
  userId: string;
  email: string;
  role: ModelDockRole;
  sessionTokenHash: string;
  csrfTokenHash: string;
  expiresAt: string;
};

export type AdminUserSummary = {
  id: string;
  email: string;
  displayName?: string;
  role: ModelDockRole;
  status: "active" | "pending_approval" | "pending_setup";
  mustChangePassword: boolean;
  createdAt?: string;
  approvedAt?: string;
  creditBalanceUsd: number;
  litellm: {
    budgetDuration?: string;
    litellmUserId?: string;
    maxBudgetUsd?: number;
    virtualKeyCount: number;
  };
};

export type AdminCreditGrant = {
  id: string;
  userId: string;
  amountUsd: number;
  reason: string;
  source: "grant";
  createdAt: string;
  balanceUsd: number;
};

export type AuthStore = {
  findActiveUserByEmail(email: string): Promise<AuthUser | undefined>;
  findActiveUserById(id: string): Promise<AuthUser | undefined>;
  grantUserCredits(input: {
    actorId: string;
    amountUsd: number;
    reason: string;
    userId: string;
  }): Promise<AdminCreditGrant>;
  listUsersForAdmin(): Promise<AdminUserSummary[]>;
  completeCredentialSetup(input: {
    email: string;
    passwordHash: PasswordHash;
    setupTokenHash: string;
    now: string;
  }): Promise<AuthUser>;
  ensureDebugAdmin?(input: { email: string; passwordHash: PasswordHash }): Promise<AuthUser>;
  markPendingCredentialSetup(input: {
    email: string;
    setupTokenHash: string;
    setupTokenExpiresAt: string;
    userId: string;
  }): Promise<void>;
  updateOwnCredentials(input: {
    userId: string;
    email: string;
    passwordHash: PasswordHash;
  }): Promise<AuthUser>;
  saveSession(session: AuthSessionRecord): Promise<void>;
  findSessionByToken(input: { token: string; sessionSecret: string; now: Date }): Promise<AuthSessionRecord | undefined>;
  deleteSession(id: string): Promise<void>;
};

export function createMemoryAuthStore(users: AuthUser[] = []): AuthStore {
  const usersByEmail = new Map(users.map((user) => [normalizeEmail(user.email), user]));
  const pendingSetupByToken = new Map<string, { email: string; expiresAt: string; userId: string }>();
  const pendingSetupByUser = new Map<string, { email: string; expiresAt: string }>();
  const creditEntries: AdminCreditGrant[] = [];
  const litellmBudgets = new Map<string, { maxBudgetUsd: number; budgetDuration: string }>();
  const sessions = new Map<string, AuthSessionRecord>();

  function balanceFor(userId: string): number {
    return creditEntries
      .filter((entry) => entry.userId === userId)
      .reduce((total, entry) => total + entry.amountUsd, 0);
  }

  return {
    async findActiveUserByEmail(email) {
      return usersByEmail.get(normalizeEmail(email));
    },
    async findActiveUserById(id) {
      return [...usersByEmail.values()].find((user) => user.id === id);
    },
    async completeCredentialSetup(input) {
      const setup = pendingSetupByToken.get(input.setupTokenHash);
      if (!setup || Date.parse(setup.expiresAt) <= Date.parse(input.now)) {
        throw new Error("Credential setup token is invalid or expired.");
      }
      const email = normalizeEmail(input.email);
      if (email !== setup.email) {
        throw new Error("Credential setup token does not match this email.");
      }
      const existing = usersByEmail.get(email);
      if (existing && existing.id !== setup.userId) {
        throw new Error("Email is already in use.");
      }
      const user: AuthUser = {
        id: setup.userId,
        email,
        role: "user",
        status: "active",
        passwordHash: input.passwordHash,
        mustChangePassword: false
      };
      pendingSetupByToken.delete(input.setupTokenHash);
      pendingSetupByUser.delete(setup.userId);
      usersByEmail.set(email, user);
      return user;
    },
    async grantUserCredits(input) {
      if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
        throw new Error("Credit grant amount must be positive.");
      }
      const user = [...usersByEmail.values()].find((candidate) => candidate.id === input.userId);
      if (!user && !pendingSetupByUser.has(input.userId)) {
        throw new Error("User was not found.");
      }
      const createdAt = new Date().toISOString();
      const entry: AdminCreditGrant = {
        id: `credit_${crypto.randomUUID()}`,
        userId: input.userId,
        amountUsd: input.amountUsd,
        reason: input.reason || "admin_credit_grant",
        source: "grant",
        createdAt,
        balanceUsd: balanceFor(input.userId) + input.amountUsd
      };
      creditEntries.push(entry);
      litellmBudgets.set(input.userId, { maxBudgetUsd: entry.balanceUsd, budgetDuration: "30d" });
      return entry;
    },
    async ensureDebugAdmin(input) {
      const email = normalizeEmail(input.email);
      const existing = usersByEmail.get(email);
      if (existing) {
        return existing;
      }
      const user: AuthUser = {
        id: "owner_debug_admin",
        email,
        role: "owner",
        status: "active",
        passwordHash: input.passwordHash,
        mustChangePassword: true
      };
      usersByEmail.set(email, user);
      return user;
    },
    async markPendingCredentialSetup(input) {
      const email = normalizeEmail(input.email);
      const existing = usersByEmail.get(email);
      if (existing && existing.id !== input.userId) {
        throw new Error("Email is already in use.");
      }
      pendingSetupByToken.set(input.setupTokenHash, {
        email,
        expiresAt: input.setupTokenExpiresAt,
        userId: input.userId
      });
      pendingSetupByUser.set(input.userId, {
        email,
        expiresAt: input.setupTokenExpiresAt
      });
    },
    async listUsersForAdmin() {
      const activeUsers: AdminUserSummary[] = [...usersByEmail.values()].map((user) => {
        const budget = litellmBudgets.get(user.id);
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          status: "active",
          mustChangePassword: user.mustChangePassword ?? false,
          creditBalanceUsd: balanceFor(user.id),
          litellm: {
            budgetDuration: budget?.budgetDuration,
            maxBudgetUsd: budget?.maxBudgetUsd,
            virtualKeyCount: 0
          }
        };
      });
      const pendingUsers: AdminUserSummary[] = [...pendingSetupByUser.entries()].map(([id, user]) => {
        const budget = litellmBudgets.get(id);
        return {
          id,
          email: user.email,
          role: "user",
          status: "pending_setup",
          mustChangePassword: false,
          creditBalanceUsd: balanceFor(id),
          litellm: {
            budgetDuration: budget?.budgetDuration,
            maxBudgetUsd: budget?.maxBudgetUsd,
            virtualKeyCount: 0
          }
        };
      });
      return [...activeUsers, ...pendingUsers].sort((left, right) => left.email.localeCompare(right.email));
    },
    async updateOwnCredentials(input) {
      const nextEmail = normalizeEmail(input.email);
      const existing = [...usersByEmail.values()].find((user) => user.id === input.userId);
      if (!existing) {
        throw new Error("User was not found.");
      }
      const emailOwner = usersByEmail.get(nextEmail);
      if (emailOwner && emailOwner.id !== input.userId) {
        throw new Error("Email is already in use.");
      }
      usersByEmail.delete(normalizeEmail(existing.email));
      const updated: AuthUser = {
        ...existing,
        email: nextEmail,
        passwordHash: input.passwordHash,
        mustChangePassword: false
      };
      usersByEmail.set(nextEmail, updated);
      return updated;
    },
    async saveSession(session) {
      sessions.set(session.id, session);
    },
    async findSessionByToken(input) {
      for (const session of sessions.values()) {
        if (Date.parse(session.expiresAt) <= input.now.getTime()) {
          sessions.delete(session.id);
          continue;
        }
        if (
          verifyTokenHash({
            token: input.token,
            expectedHash: session.sessionTokenHash,
            secret: input.sessionSecret
          })
        ) {
          return session;
        }
      }

      return undefined;
    },
    async deleteSession(id) {
      sessions.delete(id);
    }
  };
}
