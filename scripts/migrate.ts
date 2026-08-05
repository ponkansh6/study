import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function main() {
  console.log(`Connecting to ${url}...`);

  // Check existing tables
  const existing = await client.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  );
  console.log("Existing tables:", existing.rows.map((r) => r.name).join(", "));

  // Drop old tables (order matters for foreign keys)
  const drops = [
    "DROP TABLE IF EXISTS answer_logs",
    "DROP TABLE IF EXISTS questions",
    "DROP TABLE IF EXISTS knowledge",
    // Old schema tables
    "DROP TABLE IF EXISTS quiz_sets",
  ];

  for (const sql of drops) {
    console.log(`Executing: ${sql}`);
    await client.execute(sql);
  }

  // Create new tables
  const creates = [
    `CREATE TABLE knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source_text TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,

    `CREATE TABLE questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      knowledge_id INTEGER NOT NULL UNIQUE REFERENCES knowledge(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      choices TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      explanation TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,

    `CREATE INDEX questions_knowledge_id_idx ON questions(knowledge_id)`,

    `CREATE TABLE answer_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      selected_index INTEGER NOT NULL,
      is_correct INTEGER NOT NULL,
      answered_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,

    `CREATE INDEX answer_logs_question_id_idx ON answer_logs(question_id)`,
    `CREATE INDEX answer_logs_answered_at_idx ON answer_logs(answered_at)`,
  ];

  for (const sql of creates) {
    const short = sql.replace(/\s+/g, " ").slice(0, 80);
    console.log(`Executing: ${short}...`);
    await client.execute(sql);
    console.log("  OK");
  }

  // Verify
  const tables = await client.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  );
  console.log("\nFinal tables:", tables.rows.map((r) => r.name).join(", "));

  await client.close();
  console.log("Migration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
