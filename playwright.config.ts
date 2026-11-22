import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const localChrome =
  process.platform === "win32"
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : "";
const executablePath =
  process.env.STUDIO_TEST_BROWSER ||
  (existsSync(localChrome) ? localChrome : undefined);
const testDatabase = process.env.STUDIO_E2E_DB ??= path.resolve("test-results", "db-" + randomUUID() + ".sqlite");
const baseURL = "http://127.0.0.1:3417";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    launchOptions: { executablePath },
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "node node_modules/tsx/dist/cli.mjs scripts/db-migrate.ts && node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3417",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      STUDIO_DB_PATH: testDatabase, TWILIO_VERIFY_SERVICE_SID:"",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
