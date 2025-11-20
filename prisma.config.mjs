import { defineConfig } from "prisma/config";

export default defineConfig({
  seed: "tsx prisma/seed.ts",
});
