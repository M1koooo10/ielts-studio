import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  interface ProvidedContext {
    databaseTestFile: string;
  }
}

/** Windows releases the embedded SQLite file mappings when the test worker exits. */
export default async function setup(project: TestProject) {
  const directory = await mkdtemp(path.join(tmpdir(), "ielts-db-test-"));
  project.provide(
    "databaseTestFile",
    path.join(directory, "пробная база.sqlite"),
  );
  return async () => {
    await rm(directory, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
  };
}
