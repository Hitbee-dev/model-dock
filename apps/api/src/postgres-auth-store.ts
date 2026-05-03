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
  must_change_password: boolean | null;
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
    },
    mustChangePassword: row.must_change_password ?? false
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
                password_hash_salt, password_hash_value, must_change_password
         from users
         where email = $1 and status = 'active'`,
        [normalizeEmail(email)]
      );
      return toAuthUser(result.rows[0]);
    },
    async findActiveUserById(id) {
      const result = await client.query<UserRow>(
        `select id, email, role, status,
                password_hash_algorithm, password_hash_iterations,
                password_hash_salt, password_hash_value, must_change_password
         from users
         where id = $1 and status = 'active'`,
        [id]
      );
      return toAuthUser(result.rows[0]);
    },
    async completeCredentialSetup(input) {
      const result = await client.query<UserRow>(
        `update users
         set status = 'active',
             password_hash_algorithm = $3,
             password_hash_iterations = $4,
             password_hash_salt = $5,
             password_hash_value = $6,
             must_change_password = false,
             credential_setup_token_hash = null,
             credential_setup_expires_at = null
         where email = $1
           and status = 'pending_setup'
           and credential_setup_token_hash = $2
           and credential_setup_expires_at > $7
         returning id, email, role, status,
                   password_hash_algorithm, password_hash_iterations,
                   password_hash_salt, password_hash_value, must_change_password`,
        [
          normalizeEmail(input.email),
          input.setupTokenHash,
          input.passwordHash.algorithm,
          input.passwordHash.iterations,
          input.passwordHash.salt,
          input.passwordHash.hash,
          input.now
        ]
      );
      const user = toAuthUser(result.rows[0]);
      if (!user) {
        throw new Error("Credential setup token is invalid or expired.");
      }
      return user;
    },
    async ensureDebugAdmin(input) {
      const existingAdmin = await client.query<UserRow>(
        `select id, email, role, status,
                password_hash_algorithm, password_hash_iterations,
                password_hash_salt, password_hash_value, must_change_password
         from users
         where status = 'active' and role in ('owner', 'admin')
         order by created_at asc
         limit 1`
      );
      const adminUser = toAuthUser(existingAdmin.rows[0]);
      if (adminUser) {
        return adminUser;
      }

      const email = normalizeEmail(input.email);
      const existing = await client.query<UserRow>(
        `select id, email, role, status,
                password_hash_algorithm, password_hash_iterations,
                password_hash_salt, password_hash_value, must_change_password
         from users
         where email = $1 and status = 'active'`,
        [email]
      );
      const existingUser = toAuthUser(existing.rows[0]);
      if (existingUser) {
        return existingUser;
      }

      const result = await client.query<UserRow>(
        `insert into users (
           id, email, display_name, status, role,
           password_hash_algorithm, password_hash_iterations,
           password_hash_salt, password_hash_value, must_change_password, created_at
         )
         values ($1, $2, 'Local administrator', 'active', 'owner', $3, $4, $5, $6, true, now())
         on conflict (email) do update
           set status = 'active',
               role = 'owner',
               password_hash_algorithm = excluded.password_hash_algorithm,
               password_hash_iterations = excluded.password_hash_iterations,
               password_hash_salt = excluded.password_hash_salt,
               password_hash_value = excluded.password_hash_value,
               must_change_password = true
         returning id, email, role, status,
                   password_hash_algorithm, password_hash_iterations,
                   password_hash_salt, password_hash_value, must_change_password`,
        [
          "owner_debug_admin",
          email,
          input.passwordHash.algorithm,
          input.passwordHash.iterations,
          input.passwordHash.salt,
          input.passwordHash.hash
        ]
      );
      return toAuthUser(result.rows[0])!;
    },
    async updateOwnCredentials(input) {
      const result = await client.query<UserRow>(
        `update users
         set email = $2,
             password_hash_algorithm = $3,
             password_hash_iterations = $4,
             password_hash_salt = $5,
             password_hash_value = $6,
             must_change_password = false
         where id = $1 and status = 'active'
         returning id, email, role, status,
                   password_hash_algorithm, password_hash_iterations,
                   password_hash_salt, password_hash_value, must_change_password`,
        [
          input.userId,
          normalizeEmail(input.email),
          input.passwordHash.algorithm,
          input.passwordHash.iterations,
          input.passwordHash.salt,
          input.passwordHash.hash
        ]
      );
      const user = toAuthUser(result.rows[0]);
      if (!user) {
        throw new Error("User was not found.");
      }
      return user;
    },
    async markPendingCredentialSetup(input) {
      await client.query(
        `update users
         set email = $2,
             status = 'pending_setup',
             credential_setup_token_hash = $3,
             credential_setup_expires_at = $4,
             password_hash_algorithm = null,
             password_hash_iterations = null,
             password_hash_salt = null,
             password_hash_value = null,
             must_change_password = false
         where id = $1`,
        [
          input.userId,
          normalizeEmail(input.email),
          input.setupTokenHash,
          input.setupTokenExpiresAt
        ]
      );
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
