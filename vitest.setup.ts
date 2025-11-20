import "dotenv/config";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";

process.env.SENSITIVE_DATA_KEY =
  process.env.SENSITIVE_DATA_KEY ?? "test_sensitive_data_key_32chars_long!";

const skipDbSetup =
  process.env.SKIP_DB_SETUP === "1" || process.env.SKIP_DB_SETUP?.toLowerCase() === "true";

if (skipDbSetup) {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://localhost:5432/skip";
  }
  process.env.TEST_DB_SCHEMA = process.env.TEST_DB_SCHEMA ?? "test_skip";
} else {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set before running tests.");
  }

  const testSchema =
    process.env.TEST_DB_SCHEMA ??
    `test_${process.env.VITEST_POOL_ID ?? randomUUID().toString().replace(/-/g, "")}`;
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbUrl.searchParams.set("schema", testSchema);
  process.env.DATABASE_URL = dbUrl.toString();
  process.env.TEST_DB_SCHEMA = testSchema;

  execSync(
    `DATABASE_URL=${process.env.DATABASE_URL} npx prisma db push --skip-generate --accept-data-loss`,
    {
      stdio: "inherit",
    },
  );
}
