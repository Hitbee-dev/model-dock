import pg from "pg";
import { hashPassword, normalizeEmail } from "@modeldock/auth";
import { migrateModelDockDatabase } from "@modeldock/db";

const { Pool } = pg;

export type CreateOwnerInput = {
  databaseUrl?: string;
  email?: string;
  password?: string;
  displayName?: string;
};

type SqlClient = {
  query<T = unknown>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
  end?(): Promise<void>;
};

type CountRow = {
  count: string;
};

export async function createOwner(client: SqlClient, input: Required<CreateOwnerInput>): Promise<string> {
  const email = normalizeEmail(input.email);
  const passwordHash = hashPassword({ password: input.password });
  const existing = await client.query<CountRow>(
    `select count(*)::text as count from users where role = 'owner' and status = 'active'`
  );

  if (Number(existing.rows[0]?.count ?? "0") > 0) {
    throw new Error("An active owner already exists.");
  }

  const ownerId = `owner_${crypto.randomUUID()}`;
  await client.query(
    `insert into users (
       id, email, display_name, status, role,
       password_hash_algorithm, password_hash_iterations,
       password_hash_salt, password_hash_value,
       created_at, approved_at, approved_by
     ) values ($1, $2, $3, 'active', 'owner', $4, $5, $6, $7, now(), now(), $1)`,
    [
      ownerId,
      email,
      input.displayName.trim() || null,
      passwordHash.algorithm,
      passwordHash.iterations,
      passwordHash.salt,
      passwordHash.hash
    ]
  );

  return ownerId;
}

function requiredEnv(value: string | undefined, name: string): string {
  if (!value || value.startsWith("replace-with-")) {
    throw new Error(`${name} must be configured.`);
  }
  return value;
}

export async function runCreateOwner(input: CreateOwnerInput = {}): Promise<string> {
  const databaseUrl = requiredEnv(input.databaseUrl ?? process.env.DATABASE_URL, "DATABASE_URL");
  const email = requiredEnv(input.email ?? process.env.MODELDOCK_OWNER_EMAIL, "MODELDOCK_OWNER_EMAIL");
  const password = requiredEnv(input.password ?? process.env.MODELDOCK_OWNER_PASSWORD, "MODELDOCK_OWNER_PASSWORD");
  const displayName = input.displayName ?? process.env.MODELDOCK_OWNER_DISPLAY_NAME ?? "";
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await migrateModelDockDatabase(pool);
    const ownerId = await createOwner(pool, { databaseUrl, email, password, displayName });
    return `Created owner ${ownerId} for ${normalizeEmail(email)}.`;
  } finally {
    await pool.end();
  }
}
