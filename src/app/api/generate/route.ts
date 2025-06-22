import { NextRequest, NextResponse } from "next/server";
import {
  generateShortSummary,
  generateSubsystemsFromFilePaths,
  generateSummaryFromReadme,
} from "@/lib/llm";
import {
  repoUrlSchema,
  parseGitHubUrl,
  getRepoMetadata,
  getRepoTree,
  getReadmeContent,
  createWikiPageData,
} from "@/lib/github-utils";
import {
  findExistingWikiPage,
  updateWikiPage,
  createWikiPage,
} from "@/lib/wiki-utils";

// File path based generation
// This is the old generation method, it's cheaper but less accurate
export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { repoUrl } = repoUrlSchema.parse(json);

    const { owner, repo } = parseGitHubUrl(repoUrl);

    // Get default branch
    const { branch } = await getRepoMetadata(owner, repo);

    // Fetch README, readme is always an important part to understand the codebase
    const decoded = await getReadmeContent(owner, repo);
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
    const tree = await getRepoTree(owner, repo, branch);

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
    const existingWikiPage = await findExistingWikiPage(repoUrl);

    const wikiPageData = createWikiPageData(
      repoUrl,
      branch,
      owner,
      repo,
      summary,
      shortSummary
    );

    if (existingWikiPage) {
      // Update the existing wiki page and replace all subsystems
      const updatedWikiPage = await updateWikiPage(
        existingWikiPage.id,
        wikiPageData,
        subsystems
      );

      return NextResponse.json({
        id: updatedWikiPage.id,
      });
    }

    // Create new wiki page with subsystems
    const wikiPage = await createWikiPage(wikiPageData, subsystems);

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
