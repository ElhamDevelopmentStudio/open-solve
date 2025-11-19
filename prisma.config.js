const { defineConfig } = require("prisma/config");

module.exports = defineConfig({
  seed: "tsx prisma/seed.ts",
});
