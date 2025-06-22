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
2. Init database schemas: `pnpm prisma:push`
3. Start the development server: `pnpm dev`

## How It Works

### Repository Analysis

Cubic Wiki offers two analysis modes to generate comprehensive documentation for GitHub repositories:

#### 🔍 Basic Analysis (V1)
- **Method**: File path and README-based analysis
- **Process**: 
  - Retrieves repository file structure and README content
  - Groups files by top-level directories
  - Uses LLM to intelligently organize files into logical subsystems
  - Generates comprehensive overview of repository structure
- **Advantages**: Fast, cost-effective, suitable for most repositories
- **Best for**: Quick documentation generation and repositories with clear file organization

#### ✨ Advanced Analysis (V2) - Beta
- **Method**: Full file content analysis with AI clustering
- **Process**:
  - Downloads the entire codebase content
  - Uses AI to identify and select the most important files (up to 50)
  - Generates individual file summaries and embeddings
  - Applies K-means clustering to group related files into subsystems
  - Creates intelligent file groupings based on semantic similarity
  - Provides deeper insights into code architecture and patterns
- **Advantages**: More accurate subsystem identification, better understanding of code relationships
- **Best for**: Complex repositories, detailed architectural analysis
- **Note**: Request timeout is 60 seconds, larger repositories may fail to generate

### Deep Dive Analysis
For specific subsystems, users can request "Get More Insights" to:
- Send all relevant files to the LLM for detailed analysis
- Generate in-depth insights about the subsystem's architecture and functionality
- Provide recommendations and understanding of the codebase
- Create Mermaid diagrams to visualize system architecture

## Features

- **Dual Analysis Modes**: Choose between fast path-based analysis (V1) or comprehensive content-based analysis (V2)
- **Intelligent File Grouping**: LLM-powered subsystem identification with semantic clustering
- **Comprehensive Summaries**: Detailed analysis of repository structure and architecture
- **Deep Dive Capabilities**: Subsystem-specific insights with Mermaid diagram generation
- **File Content Analysis**: Advanced V2 mode analyzes actual code content for better accuracy
- **AI-Powered Clustering**: K-means clustering groups related files based on semantic similarity
- **Smart File Selection**: Automatically identifies and prioritizes the most important files
- **Modern Tech Stack**: Built with Next.js 15, TypeScript, and Mantine UI
- **Scalable Architecture**: Prisma ORM with Supabase backend and vector embeddings
