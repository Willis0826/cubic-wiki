# Cubic Wiki

A GitHub repository analysis platform that uses LLMs to intelligently group files into subsystems and generate comprehensive summaries.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: Mantine UI, Tailwind CSS
- **Backend**: Supabase, Prisma ORM
- **AI**: OpenAI GPT-4o-mini
- **Deployment**: Vercel
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

1. **Database Setup**: Create a database on Supabase or run PostgreSQL with Docker locally
2. **OpenAI API Key**: Get an OpenAI API key with sufficient credits
3. **GitHub Token**: Create a GitHub personal access token
4. **Environment Variables**: Create a `.env` file in the root directory

### Environment Configuration

```env
# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# GitHub
GITHUB_TOKEN=

# Database
DATABASE_URL=
```

### Installation & Development

1. Install dependencies: `pnpm install`
2. Run database migrations: `pnpm prisma migrate dev`
3. Start the development server: `pnpm dev`

## How It Works

### Repository Analysis
Users can submit a GitHub repository URL, and the service will:
- Retrieve file paths and README content
- Use LLM to intelligently group files into logical subsystems
- Generate a comprehensive overview of the repository structure

### Deep Dive Analysis
For specific subsystems, users can request "Get More Insights" to:
- Send all relevant files to the LLM for detailed analysis
- Generate in-depth insights about the subsystem's architecture and functionality
- Provide recommendations and understanding of the codebase

## Features

- **Intelligent File Grouping**: LLM-powered subsystem identification
- **Comprehensive Summaries**: Detailed analysis of repository structure
- **Deep Dive Capabilities**: Subsystem-specific insights and recommendations
- **Modern Tech Stack**: Built with Next.js 15, TypeScript, and Mantine UI
- **Scalable Architecture**: Prisma ORM with Supabase backend
