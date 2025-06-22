import { Octokit } from "octokit";
import { z } from "zod";
import JSZip from "jszip";

// Zod schema for safety
export const repoUrlSchema = z.object({
  repoUrl: z.string().url(),
});

// Create Octokit client
export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  // Disable throttling, otherwise the request will hang until the rate limit is reset
  throttle: { onRateLimit: () => false, onSecondaryRateLimit: () => false },
});

// GitHub URL parsing utility
export function parseGitHubUrl(repoUrl: string) {
  const match = repoUrl.match(
    /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/|$)/
  );
  if (!match) {
    throw new Error("Invalid GitHub URL");
  }
  return {
    owner: match[1],
    repo: match[2],
  };
}

// Get repository metadata
export async function getRepoMetadata(owner: string, repo: string) {
  const repoMeta = await octokit.rest.repos.get({ owner, repo });
  return {
    branch: repoMeta.data.default_branch,
  };
}

// Get repository tree
export async function getRepoTree(owner: string, repo: string, branch: string) {
  const treeRes = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: "true",
  });

  return treeRes.data.tree.filter((item) => item.type === "blob");
}

// Get README content
export async function getReadmeContent(owner: string, repo: string) {
  const readme = await octokit.rest.repos.getReadme({ owner, repo });
  return Buffer.from(readme.data.content, "base64").toString("utf-8");
}

// Get file content utility (for generate-v2)
export async function getFileContent(repoUrl: string, filePath: string) {
  try {
    const { owner, repo } = parseGitHubUrl(repoUrl);
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
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
}

// Get file content from repo zip, for better performance and handling rate limit
export async function getFileFromRepoZip(
  repoUrl: string
): Promise<{ path: string; content: string }[]> {
  const { owner, repo } = parseGitHubUrl(repoUrl);

  // Get default branch
  const repoMeta = await octokit.rest.repos.get({ owner, repo });
  const branch = repoMeta.data.default_branch;

  // Download the ZIP archive
  const response = await octokit.request(
    `GET /repos/${owner}/${repo}/zipball/${branch}`,
    {
      owner,
      repo,
      ref: branch,
      headers: { Accept: "application/vnd.github.v3.raw" },
    }
  );

  // Extract ZIP contents
  const zip = await JSZip.loadAsync(Buffer.from(response.data as any));
  const files: { path: string; content: string }[] = [];

  for (const fullPath in zip.files) {
    const entry = zip.files[fullPath];
    if (entry.dir) continue;

    // Strip GitHub-added root directory (e.g., "owner-repo-sha/")
    const relativePath = fullPath.substring(fullPath.indexOf("/") + 1);

    try {
      const content = await entry.async("string");
      files.push({ path: relativePath, content });
    } catch {
      // Skip unreadable (likely binary) files
    }
  }

  return files;
}

// Common wiki page data structure
export interface WikiPageData {
  repoUrl: string;
  branch: string;
  title: string;
  summary: string;
  shortSummary: string;
}

// Create wiki page data
export function createWikiPageData(
  repoUrl: string,
  branch: string,
  owner: string,
  repo: string,
  summary: string,
  shortSummary: string
): WikiPageData {
  return {
    repoUrl,
    branch,
    title: `${owner}/${repo}`,
    summary,
    shortSummary,
  };
}
