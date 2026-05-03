import { postgresSchema } from "./schema.js";

export type SqlClient = {
  query<T = unknown>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
};

export async function migrateModelDockDatabase(client: SqlClient): Promise<void> {
  for (const statement of postgresSchema) {
    await client.query(`${statement};`);
  }
}

