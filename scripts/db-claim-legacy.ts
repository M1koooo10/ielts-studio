import { connection } from "../src/server/db/connection";
import { claimLegacy } from "../src/server/db/legacy";

async function main() {
  const [flag, target, ...options] = process.argv.slice(2);
  if (
    flag !== "--to" ||
    !/^\+[1-9]\d{6,14}$/.test(target || "") ||
    options.some((arg) => arg !== "--include-preferences")
  ) {
    throw new Error(
      "Использование: tsx scripts/db-claim-legacy.ts --to <подтверждённый номер E.164> [--include-preferences]",
    );
  }
  const { client } = await connection();
  try {
    const changed = await claimLegacy(
      client,
      target,
      options.includes("--include-preferences"),
    );
    console.log(
      changed
        ? "Архив импортирован. Исходные таблицы сохранены."
        : "Архив уже импортирован в этот аккаунт.",
    );
  } finally {
    client.close();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Импорт не удался.");
  process.exitCode = 1;
});
