import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";

import * as schema from "./schema";

function createDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url) {
    return createClient({ url, authToken });
  }

  // Build time (next build): allow in-memory fallback for static generation
  if (process.env.NEXT_BUILD) {
    return createClient({ url: ":memory:" });
  }

  // Runtime without DB configured: fail fast to prevent silent data loss
  throw new Error(
    "TURSO_DATABASE_URL is required at runtime. Set it in your environment or .env.local.",
  );
}

const client = createDbClient();
export const db = drizzle({ client, schema });
