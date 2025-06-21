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

export const generateSubsystems = async (
  fileMap: Record<string, string[]>,
  readmeSummary: string
) => {
  const systemPrompt = `
You are a software engineer helping to identify high-level subsystems, balancing both feature-driven and technical perspectives
and put different files into subsystems.

Please use the file names, paths and the README summary to group the files.

The return should be a JSON array of objects, each object should have a title, summary and files.
Don't include any reasoning, code blocks or other text in the response, just the JSON.
The title should be a precise name of the subsystem, the summary should be a short description of the subsystem, and the files should be an array of file paths.

For example,

README summary:
Providing a wiki page generator to help user to understand the codebase quicker and easier

Given this folder and file structure:
{
  "src": [
    "app/api/generate/route.ts",
    "wiki/[id]/page.tsx",
    "wiki/page.tsx",
    ...
  ],
  "prisma": [
    "schema.prisma"
  ],
  ...
}

Return a JSON array like:
[
  {
    "title": "Authentication",
    "shortSummary": "Handles login and signup via email links",
    "files": ["src/auth/index.ts", "src/auth/password.ts"]
  },
  {
    "title": "Database",
    "shortSummary": "Handles database operations",
    "files": ["prisma/schema.prisma"]
  }
  ...
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
        content: `README summary: ${readmeSummary}\n\nGiven this folder and file structure:\n${JSON.stringify(
          fileMap
        )}`,
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
