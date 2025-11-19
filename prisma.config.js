import { defineConfig } from "@prisma/client/config";

module.exports = defineConfig({
  seed: "tsx prisma/seed.ts",
});
