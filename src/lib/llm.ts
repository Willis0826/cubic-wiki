import OpenAI from "openai";

const TEMPERATURE = 0.2; // more deterministic

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateSummaryFromReadme = async (readme: string) => {
  const systemPrompt = `
  You are a helpful assistant that generates a summary for a given README.
  The summary should be a short description of the repo, but also include the main features and the main purpose of the repo.
  The summary should be in markdown format.
  The summary should be in English.
  `;
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: readme,
      },
    ],
    temperature: TEMPERATURE,
  });
  return completion.choices[0].message.content || "";
};

export const generateShortSummary = async (summary: string) => {
  const systemPrompt = `
  You are a helpful assistant that generates a short summary for a given summary.
  The short summary should be a short description of the summary.
  The short summary should be in plain text.
  The short summary should be no more than 100 words.
  The short summary should be in English.
  `;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: summary },
    ],
    temperature: TEMPERATURE,
  });
  return completion.choices[0].message.content || "";
};

export const generateSubsystemsFromFilePaths = async (
  fileMap: Record<string, string[]>,
  readmeSummary: string
) => {
  const systemPrompt = `
You are a senior software architect documenting a code base.

**Goal:** Group files into HIGH-LEVEL, FEATURE-ORIENTED subsystems that an
engineer would look for: Authentication, Billing, CLI, Data-Layer, etc.
Avoid buckets that are purely technical (e.g. "components", "utils")
unless they *are* a standalone feature.

**Output rules**
• Return ONLY valid JSON – array of objects { "title", "shortSummary", "files" }.
• Don't include any code blocks \`\`\` in the output.
• 3-8 subsystems total.
• Every file path must appear in exactly one subsystem.
• Think step-by-step internally, but do NOT include that reasoning in the reply.

**Example**

README summary:
"A wiki page generator that lets developers understand any repo quickly."

Files:
{
  "src": ["cli.ts", "auth/email.ts", "auth/password.ts", "db/index.ts"],
  "prisma": ["schema.prisma"]
}

→
[
  {
    "title": "CLI Tool",
    "shortSummary": "Entry point users run to generate docs",
    "files": ["src/cli.ts"]
  },
  {
    "title": "Authentication",
    "shortSummary": "Email + password login for the web UI",
    "files": ["src/auth/email.ts", "src/auth/password.ts"]
  },
  {
    "title": "Database Layer",
    "shortSummary": "Prisma schema and helpers",
    "files": ["src/db/index.ts", "prisma/schema.prisma"]
  }
]`.trim();

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `README summary: ${readmeSummary}
        
        Files: ${JSON.stringify(fileMap)}`,
      },
    ],
    temperature: TEMPERATURE,
  });

  try {
    const subsystems = JSON.parse(
      completion.choices[0].message.content || "[]"
    ) as {
      title: string;
      shortSummary: string;
      files: string[];
    }[];

    return subsystems;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const generateImportantFiles = async (
  fileContents: {
    path: string;
    content: string;
  }[]
) => {
  const systemPrompt = `
You are a software engineer analysing a codebase.

Your job is to select the most important files from a given list of file paths.
These files should help identify the major subsystems / features of the repository.

**Constraints:**
- ONLY choose file paths from the list provided by the user.
- DO NOT invent or guess file paths that are not in the list.
- If you don't see a README or index file in the list, don't include one.
- Only return files that exist in the list.
- The file paths are case-sensitive.
- DO NOT include any binary or asset files such as images, audio, video, font files, or minified builds.
- Exclude files with extensions like: .png, .jpg, .jpeg, .svg, .gif, .webp, .ico, .mp3, .mp4, .wav, .ogg, .ttf, .woff, .woff2, .eot, .zip, .min.js, etc.

**Output:**
- A raw JSON array of strings (e.g., ["src/index.ts", "README.md"]).
- NO markdown, no commentary, no explanations.
- Limit to 50 files max.

Only output valid JSON.
  `;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: JSON.stringify(fileContents.map((file) => file.path)),
      },
    ],
    temperature: TEMPERATURE,
  });

  try {
    const importantFiles = JSON.parse(
      completion.choices[0].message.content || "[]"
    ) as string[];

    // Filter out the files that are not in the important files
    // Take care the case sensitivity of the file paths
    const fileMap = new Map(fileContents.map((f) => [f.path.toLowerCase(), f]));
    const filteredImportantFiles = importantFiles
      .map((p) => fileMap.get(p.toLowerCase()))
      .filter((f): f is { path: string; content: string } => !!f);

    console.log(filteredImportantFiles.map((file) => file.path));
    console.log(filteredImportantFiles.length);

    return filteredImportantFiles;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const generateSubsystemsFromFileSummary = async (
  fileContents: {
    path: string;
    // The content of the file
    summary: string;
  }[]
) => {
  const systemPrompt = `
  You are a software engineer generating a subsystem from a given files.

  The most important part is to understand the main features and the main purpose of the provided files array.
  The should focus on the main features and the main purpose of the provided files array.
  
  **Goal:** Analysis files by their summary and file paths and generate a concise for
  - Title for the subsystem
  - Short summary (1–2 sentences) for the subsystem

  **Output rules**
  • Return ONLY valid JSON object { "title", "shortSummary" }.
  • Don't include any code blocks \`\`\` in the output.
  • There should be only one subsystem given all the summaries of the files are highly related to each other.
  • Think step-by-step internally, but do NOT include that reasoning in the reply.

  **Example**

  Files:
  [
    {
      "path": "src/cli.ts",
      "summary": "A useful CLI tool to help user login to the web UI"
    },
    {
      "path": "src/auth/email.ts",
      "summary": "Email login for the web UI"
    },
    {
      "path": "src/auth/password.ts",
      "summary": "Password login for the web UI"
    },
    {
      "path": "src/db/index.ts",
      "summary": "User and Email database operations"
    },
    {
      "path": "prisma/schema.prisma",
      "summary": "Prisma schema for the database"
    }
  ]

  →
  {
    "title": "Authentication",
    "shortSummary": "Email + password login for the web UI"
  }
  `;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Files: ${JSON.stringify(
          fileContents.map((file) => ({
            path: file.path,
            summary: file.summary,
          }))
        )}`,
      },
    ],
  });

  try {
    const subsystem = JSON.parse(
      completion.choices[0].message.content || "{}"
    ) as {
      title: string;
      shortSummary: string;
    };
    return { ...subsystem, files: fileContents.map((file) => file.path) };
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const generateSubsystemSummaryFromFiles = async (
  title: string,
  files: {
    path: string;
    content: string;
  }[]
) => {
  const systemPrompt = `
  You are a helpful assistant that generates a summary for a given files.
  The files are related to a specific subsystem with a title.
  The summary should provide a clear and concise description that can help the user to understand the subsystem.
  The summary should be in markdown format.
  The summary should be in English.
  If you have enough information, you can also generate a diagram to help the user to understand the subsystem.
  The diagram should be in mermaid format.

  Example:
  Title: Authentication
  Files:
  - src/auth/index.ts
    import { User } from "@/auth/user";
    ...
  
  - src/auth/user.ts
    import { crypto } from "@/auth/crypto";
    ...

  Summary:
  
  This subsystem handles authentication and password management. It includes the following files:
  - src/auth/index.ts: Main authentication module
  - src/auth/user.ts: User management functionality
  - src/auth/crypto.ts: Cryptography functionality

  Diagram:
  \`\`\`mermaid
  graph TD
  \`\`\`
  `;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify({ title, files }) },
    ],
    temperature: TEMPERATURE,
  });

  return completion.choices[0].message.content || "";
};

export const generateFileSummary = async (fileContent: string) => {
  const systemPrompt = `
  You are a helpful assistant that generates a summary for a given file.
  The summary should be a short description of the file.
  The summary should be in plain text.
  The summary should be in English.
  The summary should be no more than 100 words.
  `;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: fileContent },
    ],
    temperature: TEMPERATURE,
  });

  return completion.choices[0].message.content || "";
};

export const generateFileEmbedding = async (summary: string) => {
  const embedRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: summary,
  });

  const embedding = embedRes.data[0].embedding;
  return embedding;
};
