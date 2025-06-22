import { streamText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, wikiId } = await req.json();

  if (!wikiId) {
    return Response.json({ error: "Wiki ID is required" }, { status: 400 });
  }

  // Get the wiki page and its related data
  const wiki = await prisma.wikiPage.findUnique({
    where: { id: parseInt(wikiId) },
    include: {
      Subsystems: {
        orderBy: { id: "asc" },
      },
      Files: {
        orderBy: { path: "asc" },
      },
    },
  });

  if (!wiki) {
    return Response.json({ error: "Wiki page not found" }, { status: 404 });
  }

  // Create context from wiki data
  const context = `
Wiki Page: ${wiki.title}
Repository: ${wiki.repoUrl} (branch: ${wiki.branch})

Summary:
${wiki.summary}

Subsystems:
${wiki.Subsystems.map(
  (subsystem) => `
- ${subsystem.title}: ${subsystem.shortSummary}
  Files: ${Array.isArray(subsystem.files) ? subsystem.files.join(", ") : "N/A"}
`
).join("\n")}

Files:
${wiki.Files.map(
  (file) => `
- ${file.path}: ${file.summary}
`
).join("\n")}
`.trim();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages,
    system: `You are a helpful AI assistant for a wiki page. You have access to the following information about this specific wiki page:

${context}

Please answer questions based on this information. If the question is not related to this wiki page or you don't have enough information, politely let the user know. Keep your answers concise and relevant to the wiki page content.

You can use tools to get more specific information about the codebase.`,
    tools: {
      searchCodebase: tool({
        description:
          "Search for specific information in the codebase, subsystems, or files",
        parameters: z.object({
          query: z
            .string()
            .describe("The search query to find relevant information"),
        }),
        execute: async ({ query }) => {
          // Simple text-based search through the wiki data
          const searchResults = [];

          // Search in summary
          if (wiki.summary.toLowerCase().includes(query.toLowerCase())) {
            searchResults.push(`Summary: ${wiki.summary}`);
          }

          // Search in subsystems
          const matchingSubsystems = wiki.Subsystems.filter(
            (subsystem) =>
              subsystem.title.toLowerCase().includes(query.toLowerCase()) ||
              subsystem.shortSummary.toLowerCase().includes(query.toLowerCase())
          );

          matchingSubsystems.forEach((subsystem) => {
            searchResults.push(
              `Subsystem - ${subsystem.title}: ${subsystem.shortSummary}`
            );
          });

          // Search in files
          const matchingFiles = wiki.Files.filter(
            (file) =>
              file.path.toLowerCase().includes(query.toLowerCase()) ||
              file.summary.toLowerCase().includes(query.toLowerCase())
          );

          matchingFiles.forEach((file) => {
            searchResults.push(`File - ${file.path}: ${file.summary}`);
          });

          return searchResults.length > 0
            ? searchResults.join("\n\n")
            : "No relevant information found for this query.";
        },
      }),

      getSubsystemDetails: tool({
        description: "Get detailed information about a specific subsystem",
        parameters: z.object({
          subsystemName: z
            .string()
            .describe("The name of the subsystem to get details for"),
        }),
        execute: async ({ subsystemName }) => {
          const subsystem = wiki.Subsystems.find((s) =>
            s.title.toLowerCase().includes(subsystemName.toLowerCase())
          );

          if (!subsystem) {
            return `Subsystem "${subsystemName}" not found. Available subsystems: ${wiki.Subsystems.map(
              (s) => s.title
            ).join(", ")}`;
          }

          return `Subsystem: ${subsystem.title}
Description: ${subsystem.shortSummary}
Files: ${Array.isArray(subsystem.files) ? subsystem.files.join(", ") : "N/A"}`;
        },
      }),

      getFileDetails: tool({
        description: "Get detailed information about a specific file",
        parameters: z.object({
          fileName: z
            .string()
            .describe("The name or path of the file to get details for"),
        }),
        execute: async ({ fileName }) => {
          const file = wiki.Files.find((f) =>
            f.path.toLowerCase().includes(fileName.toLowerCase())
          );

          if (!file) {
            return `File "${fileName}" not found. Available files: ${wiki.Files.map(
              (f) => f.path
            ).join(", ")}`;
          }

          return `File: ${file.path}
Summary: ${file.summary}`;
        },
      }),
    },
    maxSteps: 3, // Allow multi-step tool calls
  });

  return result.toDataStreamResponse();
}
