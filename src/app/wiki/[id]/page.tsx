import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import {
  Container,
  Title,
  Paper,
  Text,
  Code,
  Stack,
  Anchor,
} from "@mantine/core";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Components } from "react-markdown";
import { SubsystemCard } from "@/components/subsystem-card/subsystem-card";

type PageProps = {
  params: { id: string };
};

// Server Component
export default async function WikiDetailPage({ params }: PageProps) {
  const wiki = await prisma.wikiPage.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      subsystems: {
        orderBy: {
          id: "asc",
        },
      },
    },
  });

  if (!wiki) return notFound();

  const components: Components = {
    code({ node, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      const isInline = !match;
      return !isInline ? (
        <Code block className={className} {...props}>
          {children}
        </Code>
      ) : (
        <Code {...props}>{children}</Code>
      );
    },
  };

  return (
    <Container py="xl">
      <Title order={2}>{wiki.title}</Title>
      <Text size="sm" mb="md" c="dimmed">
        Repo:{" "}
        <Anchor
          href={`${wiki.repoUrl}/tree/${wiki.branch}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {wiki.repoUrl}
        </Anchor>
      </Text>

      {/* Summary */}
      <Paper p="md" withBorder shadow="xs" mb="md">
        <Markdown remarkPlugins={[remarkGfm]} components={components}>
          {wiki.summary}
        </Markdown>
      </Paper>

      {/* Display subsystems */}
      {wiki.subsystems.length > 0 && (
        <Paper p="md" withBorder shadow="xs" mb="md">
          <Title order={3} mb="md">
            Subsystems
          </Title>
          <Stack gap="md">
            {wiki.subsystems.map((subsystem) => (
              <SubsystemCard
                key={subsystem.id}
                subsystem={subsystem}
                repoUrl={wiki.repoUrl}
                branch={wiki.branch}
              />
            ))}
          </Stack>
        </Paper>
      )}
    </Container>
  );
}
