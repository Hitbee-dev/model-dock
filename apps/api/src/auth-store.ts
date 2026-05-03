import { normalizeEmail, verifyTokenHash, type ModelDockRole, type PasswordHash } from "@modeldock/auth";

export type AuthUser = {
  id: string;
  email: string;
  role: ModelDockRole;
  status: "active";
  passwordHash: PasswordHash;
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

export type AuthStore = {
  findActiveUserByEmail(email: string): Promise<AuthUser | undefined>;
  saveSession(session: AuthSessionRecord): Promise<void>;
  findSessionByToken(input: { token: string; sessionSecret: string; now: Date }): Promise<AuthSessionRecord | undefined>;
  deleteSession(id: string): Promise<void>;
};

export function createMemoryAuthStore(users: AuthUser[] = []): AuthStore {
  const usersByEmail = new Map(users.map((user) => [normalizeEmail(user.email), user]));
  const sessions = new Map<string, AuthSessionRecord>();

  return {
    async findActiveUserByEmail(email) {
      return usersByEmail.get(normalizeEmail(email));
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
