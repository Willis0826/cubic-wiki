import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateSubsystemSummaryFromFiles } from "@/lib/llm";
import { getFileContent } from "@/lib/github-utils";

// Zod schema for safety
const bodySchema = z.object({
  subsystemId: z.number(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { subsystemId } = bodySchema.parse(json);

    const subsystem = await prisma.subsystem.findUnique({
      where: { id: subsystemId },
      include: {
        WikiPage: true,
      },
    });

    if (!subsystem) {
      return NextResponse.json(
        { error: "Subsystem not found" },
        { status: 404 }
      );
    }

    // Read all files in the subsystem from github
    if (!subsystem.WikiPage?.repoUrl) {
      return NextResponse.json(
        { error: "Repo URL not found" },
        { status: 404 }
      );
    }

    if (!subsystem.files || !Array.isArray(subsystem.files)) {
      return NextResponse.json({ error: "Files not found" }, { status: 400 });
    }

    // Use Promise.all to fetch all files concurrently
    const fileContents = await Promise.all(
      subsystem.files.map(async (filePath) => {
        const content = await getFileContent(
          subsystem.WikiPage!.repoUrl,
          filePath as string
        );
        return {
          path: filePath as string,
          content: content || "",
        };
      })
    );

    // Filter out files that couldn't be fetched
    const validFiles = fileContents.filter((file) => file.content !== "");

    if (validFiles.length === 0) {
      return NextResponse.json(
        { error: "No valid files found" },
        { status: 404 }
      );
    }

    // Get the summary from the files
    const summary = await generateSubsystemSummaryFromFiles(
      subsystem.title,
      validFiles
    );

    // Update the subsystem with the summary
    await prisma.subsystem.update({
      where: { id: subsystemId },
      data: {
        summary,
      },
    });

    return NextResponse.json({
      success: true,
      filesProcessed: validFiles.length,
      totalFiles: subsystem.files.length,
      summary: summary,
    });
  } catch (error: unknown) {
    console.error("Error in generate-subsystem-summary:", error);

    // Type-safe error handling
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
