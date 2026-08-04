import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

import * as schema from "./schema";

const url = process.env.TURSO_DATABASE_URL;
if (process.env.NODE_ENV === "production" && !url) {
  throw new Error("TURSO_DATABASE_URL must be set in production");
}

const client = createClient({
  url: url ?? ":memory:",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle({ client, schema });
