import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  generateShortSummary,
  generateSubsystemsFromFileSummary,
  generateSummaryFromReadme,
  generateFileSummary,
  generateFileEmbedding,
} from "@/lib/llm";
import pLimit from "p-limit";
import { kmeans } from "ml-kmeans";

// Limit the number of concurrent requests to 10
const limit = pLimit(10);

// Zod schema for safety
const bodySchema = z.object({
  repoUrl: z.string().url(),
});

// Create clients
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const getFileContent = async (repoUrl: string, filePath: string) => {
  try {
    const response = await octokit.rest.repos.getContent({
      owner: repoUrl.split("/")[3],
      repo: repoUrl.split("/")[4],
      path: filePath,
    });

    // Handle the case where response.data might be an array
    if (Array.isArray(response.data)) {
      return null;
    }

    if (response.data.type !== "file") {
      return null;
    }

    return Buffer.from(response.data.content || "", "base64").toString("utf-8");
  } catch (error) {
    console.error(`Failed to fetch file ${filePath}:`, error);
    return null;
  }
};

// File content based generation
// This is the new generation method, it's more accurate but more expensive
// Pro feature
export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { repoUrl } = bodySchema.parse(json);

    const match = repoUrl.match(
      /github\.com\/([^\/]+)\/([^\/\.]+?)(?:\.git)?(?:\/|$)/
    );
    if (!match) {
      return NextResponse.json(
        { error: "Invalid GitHub URL" },
        { status: 400 }
      );
    }
    const owner = match[1];
    const repo = match[2];

    // Get default branch
    const repoMeta = await octokit.rest.repos.get({ owner, repo });
    const branch = repoMeta.data.default_branch;

    // Get repo tree
    // There is a limit of 100,000 entries and 7MB of data
    const treeRes = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: "true",
    });

    const tree = treeRes.data.tree.filter((item) => item.type === "blob");

    // Use Promise.all to fetch all files concurrently
    const fileContents = await Promise.all(
      tree.map(async (file) => {
        const content = await getFileContent(repoUrl, file.path!);
        return {
          path: file.path!,
          content: content || "",
        };
      })
    );

    // Generate summary, embedding, and save to database for each file
    // Using plimit to limit the number of concurrent requests to 10
    const fileSummaries = await Promise.all(
      fileContents.map((file) => limit(() => generateFileSummary(file.content)))
    );
    const fileEmbedding = await Promise.all(
      fileSummaries.map((summary) => generateFileEmbedding(summary))
    );

    // Clustering the files
    // Try to create 1 cluster per 5 files
    // Try to create at least 2 clusters and at most 8 clusters
    const K = Math.min(8, Math.max(2, Math.floor(fileEmbedding.length / 5))); // heuristic
    const clustering = kmeans(fileEmbedding, K, {});
    // Prepare empty clusters to fill in with files
    const clusters: {
      files: { path: string; summary: string; embedding: number[] }[];
    }[] = Array.from({ length: K }, (_, i) => ({
      files: [], // initially empty
      centroid: clustering.centroids[i], // the center of the cluster
    }));
    // Assign each file to the closest cluster
    for (let i = 0; i < fileEmbedding.length; i++) {
      const embedding = fileEmbedding[i];
      const path = fileContents[i].path;
      const summary = fileSummaries[i];
      // Which cluster this file belongs to
      const clusterIndex = clustering.clusters[i];
      // Add the file to the right cluster
      clusters[clusterIndex].files.push({
        path,
        summary,
        embedding,
      });
    }

    // Fetch README, readme is always an important part to understand the codebase
    const readme = await octokit.rest.repos.getReadme({ owner, repo });
    const decoded = Buffer.from(readme.data.content, "base64").toString(
      "utf-8"
    );
    let summary = "";
    try {
      summary = await generateSummaryFromReadme(decoded);
    } catch {
      summary = "";
    }

    // Generate short summary for the wiki page list
    let shortSummary = "";
    try {
      shortSummary = await generateShortSummary(summary);
    } catch {
      shortSummary = "";
    }

    // Generate subsystems for each cluster
    const subsystems = (
      await Promise.all(
        clusters.map((cluster) =>
          generateSubsystemsFromFileSummary(cluster.files, summary)
        )
      )
    ).filter((subsystem) => subsystem !== null);

    // Check if a wiki page already exists for this repository
    const existingWikiPage = await prisma.wikiPage.findFirst({
      where: { repoUrl },
    });

    const wikiPageData = {
      repoUrl,
      branch,
      title: `${owner}/${repo}`,
      summary,
      shortSummary,
    };

    if (existingWikiPage) {
      // Update the existing wiki page and replace all subsystems
      const updatedWikiPage = await prisma.wikiPage.update({
        where: { id: existingWikiPage.id },
        data: {
          ...wikiPageData,
          subsystems: {
            deleteMany: {}, // Delete all existing subsystems
            create: subsystems.map((subsystem) => ({
              title: subsystem.title,
              shortSummary: subsystem.shortSummary,
              files: subsystem.files,
            })),
          },
          File: {
            deleteMany: {}, // Delete all existing files
            create: fileContents.map((file, index) => ({
              path: file.path,
              summary: fileSummaries[index],
              embedding: fileEmbedding[index],
            })),
          },
        },
        include: {
          subsystems: true,
          File: true,
        },
      });

      return NextResponse.json({
        id: updatedWikiPage.id,
      });
    }

    // Create new wiki page with subsystems
    const wikiPage = await prisma.wikiPage.create({
      data: {
        ...wikiPageData,
        subsystems: {
          create: subsystems.map((subsystem) => ({
            title: subsystem.title,
            shortSummary: subsystem.shortSummary,
            files: subsystem.files,
          })),
        },
        File: {
          create: fileContents.map((file, index) => ({
            path: file.path,
            summary: fileSummaries[index],
            embedding: fileEmbedding[index],
          })),
        },
      },
      include: {
        subsystems: true,
      },
    });

    return NextResponse.json({
      id: wikiPage.id,
    });
  } catch (err: unknown) {
    console.error(err);

    // Type-safe error handling
    const errorMessage =
      err instanceof Error ? err.message : "An unknown error occurred";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
