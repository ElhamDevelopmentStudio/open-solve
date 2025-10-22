import "dotenv/config";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";

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

execSync(`DATABASE_URL=${process.env.DATABASE_URL} npx prisma migrate deploy`, {
  stdio: "inherit",
});
