import { NextRequest, NextResponse } from "next/server";
import {
  generateShortSummary,
  generateSubsystemsFromFileSummary,
  generateSummaryFromReadme,
  generateFileSummary,
  generateFileEmbedding,
  generateImportantFiles,
} from "@/lib/llm";
import pLimit from "p-limit";
import { kmeans } from "ml-kmeans";
import {
  repoUrlSchema,
  parseGitHubUrl,
  getRepoMetadata,
  getReadmeContent,
  createWikiPageData,
  getFileFromRepoZip,
} from "@/lib/github-utils";
import {
  findExistingWikiPage,
  updateWikiPageWithFiles,
  createWikiPageWithFiles,
} from "@/lib/wiki-utils";

// Limit the number of concurrent requests to 10
const limit = pLimit(10);

// File content based generation
// This is the new generation method, it's more accurate but more expensive
// Pro feature
export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { repoUrl } = repoUrlSchema.parse(json);

    const { owner, repo } = parseGitHubUrl(repoUrl);

    // Get default branch
    const { branch } = await getRepoMetadata(owner, repo);

    // Get file content from repo zip
    const fileContents = await getFileFromRepoZip(repoUrl);

    // Filter out the files by the file name
    const filteredFileContents = fileContents.filter((file) => {
      if (
        file.path.startsWith("dist/") ||
        file.path.endsWith(".lock") ||
        file.path.includes("package-lock.json") ||
        file.path.includes("pnpm-lock.yaml") ||
        file.path.includes("node_modules/") ||
        file.path.endsWith(".exe") ||
        file.path.endsWith(".png") ||
        file.path.endsWith(".jpg") ||
        file.path.endsWith(".jpeg") ||
        file.path.endsWith(".gif") ||
        file.path.endsWith(".svg") ||
        file.path.endsWith(".ico") ||
        file.path.endsWith(".webp") ||
        file.path.endsWith(".mp4") ||
        file.path.endsWith(".mp3") ||
        file.path.endsWith(".wav") ||
        file.path.endsWith(".ogg") ||
        file.path.endsWith(".flac") ||
        file.path.endsWith(".webm") ||
        file.path.endsWith(".mov") ||
        file.path.endsWith(".zip") ||
        file.path.endsWith(".tar") ||
        file.path.endsWith(".gz") ||
        file.path.endsWith(".bz2") ||
        file.path.endsWith(".xz") ||
        file.path.endsWith(".7z") ||
        file.path.endsWith(".rar") ||
        file.path.endsWith(".iso")
      ) {
        return false;
      }
      return true;
    });

    // Ask LLM to only keep the important files for inferring the subsystems if the file count is more than 50
    let importantFiles: { path: string; content: string }[] = [];
    if (filteredFileContents.length > 50) {
      importantFiles = await generateImportantFiles(filteredFileContents);
    } else {
      importantFiles = filteredFileContents;
    }

    // Generate summary, embedding, and save to database for each file
    // Using plimit to limit the number of concurrent requests to 10
    const fileSummaries = await Promise.all(
      importantFiles.map((file) =>
        limit(() =>
          generateFileSummary(file.content).catch((err) => {
            // skip the error, it could be token limit error
            console.error(err);
            return "";
          })
        )
      )
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
      const path = importantFiles[i].path;
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
    // Generate subsystems for each cluster
    const subsystems = (
      await Promise.all(
        clusters.map((cluster) =>
          generateSubsystemsFromFileSummary(cluster.files)
        )
      )
    ).filter((subsystem) => subsystem !== null);

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
      const updatedWikiPage = await updateWikiPageWithFiles(
        existingWikiPage.id,
        wikiPageData,
        subsystems,
        importantFiles,
        fileSummaries,
        fileEmbedding
      );

      return NextResponse.json({
        id: updatedWikiPage.id,
      });
    }

    // Create new wiki page with subsystems
    const wikiPage = await createWikiPageWithFiles(
      wikiPageData,
      subsystems,
      importantFiles,
      fileSummaries,
      fileEmbedding
    );

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
