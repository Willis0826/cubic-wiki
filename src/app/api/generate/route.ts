import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "octokit";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  generateShortSummary,
  generateSubsystemsFromFilePaths,
  generateSummaryFromReadme,
} from "@/lib/llm";

// Zod schema for safety
const bodySchema = z.object({
  repoUrl: z.string().url(),
});

// Create clients
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// File path based generation
// This is the old generation method, it's cheaper but less accurate
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

    // Get repo tree
    // There is a limit of 100,000 entries and 7MB of data
    const treeRes = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: "true",
    });

    const tree = treeRes.data.tree.filter((item) => item.type === "blob");

    // Group by top-level folder
    const buckets: Record<string, string[]> = {};
    for (const file of tree) {
      const segments = file.path?.split("/") || [];
      const top = segments[0];
      if (!buckets[top]) {
        buckets[top] = [];
      }
      buckets[top].push(file.path!);
    }

    // Analysis the code structure and group them into subsystems
    // also use the readme summary to help the analysis
    const subsystems = await generateSubsystemsFromFilePaths(buckets, summary);

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
            create: subsystems,
          },
        },
        include: {
          subsystems: true,
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
          create: subsystems,
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
