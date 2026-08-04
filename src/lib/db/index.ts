import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";

import * as schema from "./schema";

function createDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url) {
    return createClient({ url, authToken });
  }

  // CI / local dev fallback: use in-memory DB
  // Queries will fail at runtime if Turso is actually needed
  return createClient({ url: ":memory:" });
}

const client = createDbClient();
export const db = drizzle({ client, schema });
