import {
  assertRole,
  hashSessionToken,
  normalizeEmail,
  type ModelDockRole,
  type PasswordHash
} from "@modeldock/auth";

import { createPostgresPool, isUsableDatabaseUrl, migrateApiDatabase, type QueryClient } from "./postgres.js";
import type { AuthSessionRecord, AuthStore, AuthUser } from "./auth-store.js";

type UserRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  password_hash_algorithm: PasswordHash["algorithm"] | null;
  password_hash_iterations: number | null;
  password_hash_salt: string | null;
  password_hash_value: string | null;
};

type SessionRow = {
  id: string;
  user_id: string;
  email: string;
  role: string;
  session_token_hash: string;
  csrf_token_hash: string;
  expires_at: Date | string;
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toAuthUser(row: UserRow | undefined): AuthUser | undefined {
  if (
    !row ||
    row.status !== "active" ||
    !row.password_hash_algorithm ||
    !row.password_hash_iterations ||
    !row.password_hash_salt ||
    !row.password_hash_value
  ) {
    return undefined;
  }

  return {
    id: row.id,
    email: row.email,
    role: assertRole(row.role),
    status: "active",
    passwordHash: {
      algorithm: row.password_hash_algorithm,
      iterations: row.password_hash_iterations,
      salt: row.password_hash_salt,
      hash: row.password_hash_value
    }
  };
}

function toSession(row: SessionRow | undefined): AuthSessionRecord | undefined {
  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    role: assertRole(row.role) as ModelDockRole,
    sessionTokenHash: row.session_token_hash,
    csrfTokenHash: row.csrf_token_hash,
    expiresAt: toIso(row.expires_at)
  };
}

export async function createPostgresAuthStoreFromEnv(input: {
  databaseUrl: string | undefined;
  fallback: AuthStore;
  nodeEnv: string | undefined;
}): Promise<AuthStore> {
  if (!isUsableDatabaseUrl(input.databaseUrl)) {
    if (input.nodeEnv === "production") {
      throw new Error("DATABASE_URL must be configured in production.");
    }
    return input.fallback;
  }

  const pool = createPostgresPool(input.databaseUrl);
  await migrateApiDatabase(pool);
  return createPostgresAuthStore(pool);
}

export function createPostgresAuthStore(client: QueryClient): AuthStore {
  return {
    async findActiveUserByEmail(email) {
      const result = await client.query<UserRow>(
        `select id, email, role, status,
                password_hash_algorithm, password_hash_iterations,
                password_hash_salt, password_hash_value
         from users
         where email = $1 and status = 'active'`,
        [normalizeEmail(email)]
      );
      return toAuthUser(result.rows[0]);
    },
    async saveSession(session) {
      await client.query(
        `insert into sessions (id, user_id, session_token_hash, csrf_token_hash, expires_at, created_at)
         values ($1, $2, $3, $4, $5, now())`,
        [session.id, session.userId, session.sessionTokenHash, session.csrfTokenHash, session.expiresAt]
      );
    },
    async findSessionByToken(input) {
      await client.query(`delete from sessions where expires_at <= $1`, [input.now.toISOString()]);
      const result = await client.query<SessionRow>(
        `select sessions.id, sessions.user_id, users.email, users.role,
                sessions.session_token_hash, sessions.csrf_token_hash, sessions.expires_at
         from sessions
         join users on users.id = sessions.user_id
         where sessions.session_token_hash = $1
           and sessions.expires_at > $2
           and sessions.revoked_at is null
           and users.status = 'active'`,
        [hashSessionToken({ token: input.token, sessionSecret: input.sessionSecret }), input.now.toISOString()]
      );
      return toSession(result.rows[0]);
    },
    async deleteSession(id) {
      await client.query(`update sessions set revoked_at = now() where id = $1`, [id]);
    }
  };
}
