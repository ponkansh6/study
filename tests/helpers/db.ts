import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "@/lib/db/schema";

export async function createTestDb() {
  const client = createClient({ url: ":memory:" });
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: "./src/lib/db/migrations" });
  return { db, client };
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;
