import { defineConfig } from "@prisma/client/config";

export default defineConfig({
  seed: "tsx prisma/seed.ts",
});
