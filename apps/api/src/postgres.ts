import pg from "pg";
import { migrateModelDockDatabase } from "@modeldock/db";

import type { RegistrationStore } from "./registrations.js";

const { Pool } = pg;

export type QueryClient = {
  query<T = unknown>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
};

type PendingRegistrationRow = {
  id: string;
  email: string;
  display_name: string | null;
  status: "pending_approval";
  created_at: Date;
};

type ApprovedRegistrationRow = Omit<PendingRegistrationRow, "status"> & {
  status: "active";
  approved_at: Date;
  approved_by: string;
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export function isUsableDatabaseUrl(value: string | undefined): value is string {
  return Boolean(value && !value.includes("replace-with-"));
}

export async function migrateApiDatabase(client: QueryClient): Promise<void> {
  await migrateModelDockDatabase(client);
}

export function createPostgresPool(databaseUrl: string): pg.Pool {
  return new Pool({
    connectionString: databaseUrl,
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });
}

export async function createRegistrationStoreFromEnv(input: {
  databaseUrl: string | undefined;
  fallback: RegistrationStore;
  nodeEnv: string | undefined;
}): Promise<RegistrationStore> {
  const { databaseUrl, fallback, nodeEnv } = input;
  if (!isUsableDatabaseUrl(databaseUrl)) {
    if (nodeEnv === "production") {
      throw new Error("DATABASE_URL must be configured in production.");
    }
    return fallback;
  }

  const pool = createPostgresPool(databaseUrl);
  await migrateApiDatabase(pool);
  return createPostgresRegistrationStore(pool);
}

export function createPostgresRegistrationStore(client: QueryClient): RegistrationStore {
  return {
    async submit(input) {
      const id = `reg_${crypto.randomUUID()}`;
      const email = input.email.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new Error("A valid email address is required.");
      }

      const result = await client.query<PendingRegistrationRow>(
        `insert into users (id, email, display_name, status, role, created_at)
         values ($1, $2, $3, 'pending_approval', 'user', now())
         returning id, email, display_name, status, created_at`,
        [id, email, input.displayName?.trim() || null]
      );
      return toPendingRegistration(result.rows[0]);
    },
    async listPending() {
      const result = await client.query<PendingRegistrationRow>(
        `select id, email, display_name, status, created_at
         from users
         where status = 'pending_approval'
         order by created_at asc`
      );
      return result.rows.map(toPendingRegistration);
    },
    async approve(id, approvedBy) {
      const result = await client.query<ApprovedRegistrationRow>(
        `update users
         set status = 'active', approved_at = now(), approved_by = $2
         where id = $1 and status = 'pending_approval'
         returning id, email, display_name, status, created_at, approved_at, approved_by`,
        [id, approvedBy]
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error("Registration request was not found.");
      }
      return {
        id: row.id,
        email: row.email,
        displayName: row.display_name ?? undefined,
        status: "active",
        requestedAt: toIso(row.created_at),
        approvedAt: toIso(row.approved_at),
        approvedBy: row.approved_by
      };
    }
  };
}

function toPendingRegistration(row: PendingRegistrationRow | undefined) {
  if (!row) {
    throw new Error("Registration request was not persisted.");
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? undefined,
    status: "pending_approval" as const,
    requestedAt: toIso(row.created_at)
  };
}
