import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as schema from "./schema";

export function databasePath() {
  return path.resolve(process.env.STUDIO_DB_PATH || "data/studio.sqlite");
}

export async function openDatabase(filename = databasePath()) {
  await mkdir(path.dirname(filename), { recursive: true });
  // libSQL passes the decoded URI path directly to SQLite, including a leading slash before a Windows drive.
  const url = pathToFileURL(filename).href.replace(
    /^file:\/\/\/(?=[A-Za-z]:\/)/,
    "file:",
  );
  const client = createClient({ url, intMode: "number", concurrency: 1 });
  try {
    await client.execute("PRAGMA foreign_keys=ON");
    await client.execute("PRAGMA busy_timeout=5000");
    await migrate(client);
    return { client, db: drizzle(client, { schema }) };
  } catch (error) {
    client.close();
    throw error;
  }
}

async function migrate(client: Client) {
  const folder = path.join(process.cwd(), "migrations");
  const files = (await readdir(folder))
    .filter((name) => /^\d+_.*\.sql$/.test(name))
    .sort();
  await client.execute(
    "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)",
  );
  for (const filename of files) {
    const sql = await readFile(path.join(folder, filename), "utf8");
    const tx = await client.transaction("write");
    try {
      const existing = await tx.execute({
        sql: "SELECT 1 FROM schema_migrations WHERE filename = ?",
        args: [filename],
      });
      if (!existing.rows.length) {
        for (const statement of sql.split(/^--> statement-breakpoint\s*$/m)) {
          if (statement.trim()) await tx.execute(statement);
        }
        await tx.execute({
          sql: "INSERT INTO schema_migrations VALUES (?, ?)",
          args: [filename, Date.now()],
        });
      }
      await tx.commit();
    } finally {
      tx.close();
    }
  }
}

type Connection = Awaited<ReturnType<typeof openDatabase>>;
const state = globalThis as typeof globalThis & {
  studioDatabase?: Promise<Connection>;
};
export function connection() {
  state.studioDatabase ??= openDatabase().catch((error) => {
    delete state.studioDatabase;
    throw error;
  });
  return state.studioDatabase;
}
