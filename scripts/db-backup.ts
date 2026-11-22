import path from "node:path";
import { mkdir } from "node:fs/promises";
import { databasePath, openDatabase } from "../src/server/db/connection";

async function main() {
  const { client } = await openDatabase();
  try {
    const directory = path.join(path.dirname(databasePath()), "backups");
    await mkdir(directory, { recursive: true });
    const destination = path.join(
      directory,
      `studio-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`,
    );
    await client.execute({ sql: "VACUUM INTO ?", args: [destination] });
    console.log(destination);
  } finally {
    client.close();
  }
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
