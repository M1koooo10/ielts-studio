import { databasePath, openDatabase } from "../src/server/db/connection";

async function main() {
  const { client } = await openDatabase();
  try {
    const result = await client.execute(
      "SELECT filename FROM schema_migrations ORDER BY filename",
    );
    console.log(
      databasePath(),
      result.rows.map((row) => row.filename).join(", "),
    );
  } finally {
    client.close();
  }
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
