import { prisma } from "../lib/prisma";

async function main() {
  console.info("Seed placeholder — add initial data when ready.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
