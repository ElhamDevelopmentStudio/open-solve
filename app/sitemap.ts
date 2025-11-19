import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { DIFFICULTIES } from "@/lib/problems/constants";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [problems, tags] = await Promise.all([
    prisma.problem.findMany({
      where: {
        state: "PUBLISHED",
        visibility: "PUBLIC",
        deletedAt: null,
      },
      select: {
        slug: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
    prisma.tag.findMany({
      where: { deletedAt: null },
      select: {
        slug: true,
        updatedAt: true,
      },
    }),
  ]);

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/problems`,
      lastModified: new Date(),
    },
  ];

  problems.forEach((problem) => {
    entries.push({
      url: `${baseUrl}/problems/${problem.slug}`,
      lastModified: problem.updatedAt ?? problem.createdAt ?? new Date(),
    });
  });

  tags.forEach((tag) => {
    entries.push({
      url: `${baseUrl}/tags/${tag.slug}`,
      lastModified: tag.updatedAt ?? new Date(),
    });
  });

  DIFFICULTIES.forEach((difficulty) => {
    entries.push({
      url: `${baseUrl}/difficulty/${difficulty.toLowerCase()}`,
      lastModified: new Date(),
    });
  });

  return entries;
}
