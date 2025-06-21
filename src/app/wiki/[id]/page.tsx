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
  ScrollArea,
  Flex,
  Box,
  Group,
} from "@mantine/core";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Components } from "react-markdown";
import { IconBrain, IconSparkles } from "@tabler/icons-react";
import { InteractiveInsightsButton } from "./interactive-insights-button";

type PageProps = {
  params: { id: string };
};

// Server Component
export default async function WikiDetailPage({ params }: PageProps) {
  const wiki = await prisma.wikiPage.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      subsystems: true,
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
              <Paper key={subsystem.id} p="sm" withBorder>
                <Stack gap="xs">
                  <Title order={4}>{subsystem.title}</Title>
                  <Text size="sm">{subsystem.shortSummary}</Text>
                  {/* A section to encourage users to trigger a analysis all files in the subsystem */}
                  {/* only display if summary is empty or null */}
                  {!subsystem.summary && (
                    <Box
                      p="md"
                      bg="linear-gradient(135deg,rgb(73, 100, 219) 0%,rgb(104, 89, 219) 100%)"
                      style={{
                        borderRadius: "12px",
                        overflow: "hidden",
                      }}
                    >
                      <Stack
                        gap="xs"
                        style={{ position: "relative", zIndex: 1 }}
                      >
                        <Group gap="xs" align="center">
                          <IconBrain size={20} color="white" />
                          <Text size="sm" fw={600} c="white">
                            AI Analysis Available
                          </Text>
                          <IconSparkles size={16} color="white" />
                        </Group>

                        <Text size="xs" c="white" opacity={0.9}>
                          Get detailed insights about this subsystem's
                          architecture, patterns, and recommendations
                        </Text>

                        <InteractiveInsightsButton subsystemId={subsystem.id} />
                      </Stack>
                    </Box>
                  )}
                  {subsystem.summary && (
                    <Text size="sm">{subsystem.summary}</Text>
                  )}
                  {/* Files */}
                  <div>
                    <Text size="xs" c="dimmed">
                      Files:
                    </Text>
                    <ScrollArea mah={200}>
                      <Flex direction="column">
                        {Array.isArray(subsystem.files) &&
                          subsystem.files.map((file, index) => (
                            <Anchor
                              key={index}
                              href={`${wiki.repoUrl}/blob/${
                                wiki.branch
                              }/${file?.toString()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              w="fit-content"
                            >
                              {file?.toString()}
                            </Anchor>
                          ))}
                      </Flex>
                    </ScrollArea>
                  </div>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}
    </Container>
  );
}
