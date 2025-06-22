import { prisma } from "@/lib/prisma";
import { WikiPageData } from "./github-utils";
import { type Prisma } from "@prisma/client";

// Check if wiki page exists and get it
export async function findExistingWikiPage(repoUrl: string) {
  return await prisma.wikiPage.findFirst({
    where: { repoUrl },
  });
}

// Update existing wiki page with new data
export async function updateWikiPage(
  wikiPageId: number,
  wikiPageData: WikiPageData,
  subsystems: Prisma.SubsystemCreateManyInput[]
) {
  return await prisma.wikiPage.update({
    where: { id: wikiPageId },
    data: {
      ...wikiPageData,
      Subsystems: {
        deleteMany: {}, // Delete all existing subsystems
        create: subsystems,
      },
    },
    include: {
      Subsystems: true,
    },
  });
}

// Update existing wiki page with subsystems and files (for generate-v2)
export async function updateWikiPageWithFiles(
  wikiPageId: number,
  wikiPageData: WikiPageData,
  subsystems: Prisma.SubsystemCreateManyInput[],
  fileContents: {
    path: string;
    content: string;
  }[],
  fileSummaries: string[],
  fileEmbeddings: number[][]
) {
  return await prisma.wikiPage.update({
    where: { id: wikiPageId },
    data: {
      summary: wikiPageData.summary,
      shortSummary: wikiPageData.shortSummary,
      title: wikiPageData.title,
      branch: wikiPageData.branch,
      Subsystems: {
        deleteMany: {}, // Delete all existing subsystems
        create: subsystems.map((subsystem) => ({
          title: subsystem.title,
          shortSummary: subsystem.shortSummary,
          files: subsystem.files,
        })),
      },
      Files: {
        deleteMany: {}, // Delete all existing files
        create: fileContents.map((file, index) => ({
          path: file.path,
          summary: fileSummaries[index],
          embedding: fileEmbeddings[index],
        })),
      },
    },
    include: {
      Subsystems: true,
      Files: true,
    },
  });
}

// Create new wiki page with subsystems
export async function createWikiPage(
  wikiPageData: WikiPageData,
  subsystems: Prisma.SubsystemCreateManyInput[]
) {
  return await prisma.wikiPage.create({
    data: {
      ...wikiPageData,
      Subsystems: {
        create: subsystems,
      },
    },
    include: {
      Subsystems: true,
    },
  });
}

// Create new wiki page with subsystems and files (for generate-v2)
export async function createWikiPageWithFiles(
  wikiPageData: WikiPageData,
  subsystems: Prisma.SubsystemCreateManyInput[],
  fileContents: {
    path: string;
    content: string;
  }[],
  fileSummaries: string[],
  fileEmbeddings: number[][]
) {
  return await prisma.wikiPage.create({
    data: {
      ...wikiPageData,
      Subsystems: {
        create: subsystems.map((subsystem) => ({
          title: subsystem.title,
          shortSummary: subsystem.shortSummary,
          files: subsystem.files,
        })),
      },
      Files: {
        create: fileContents.map((file, index) => ({
          path: file.path,
          summary: fileSummaries[index],
          embedding: fileEmbeddings[index],
        })),
      },
    },
    include: {
      Subsystems: true,
    },
  });
}
