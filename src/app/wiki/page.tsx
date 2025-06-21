import { prisma } from "@/lib/prisma";
import {
  Anchor,
  Box,
  Container,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";

export const dynamic = "force-dynamic"; // for SSR always fresh

// Helper function to validate and sanitize URLs
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Only allow http, https, and git protocols
    return ["http:", "https:", "git:"].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

// Helper function to get display text for URL
function getDisplayUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname + urlObj.pathname;
  } catch {
    return url;
  }
}

export default async function WikiListPage() {
  const wikis = await prisma.wikiPage.findMany({
    orderBy: { id: "desc" },
  });

  return (
    <Container py="xl">
      <Title order={2} mb="md">
        📚 All Wikis
      </Title>
      <Stack>
        {wikis.length === 0 ? (
          <Text ta="center" c="dimmed" size="lg">
            No wikis found.{" "}
            <Anchor href="/">Create the first wiki to get started!</Anchor>
          </Text>
        ) : (
          wikis.map((w) => (
            <Paper key={w.id} p="md" withBorder shadow="sm" radius="md">
              <Anchor href={`/wiki/${w.id}`}>
                <Text fw={600}>{w.title}</Text>
              </Anchor>
              <Stack>
                <Box key={w.id}>
                  Repo:{" "}
                  {isValidUrl(w.repoUrl) ? (
                    <Anchor
                      href={w.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {getDisplayUrl(w.repoUrl)}
                    </Anchor>
                  ) : (
                    <Text c="red" size="sm">
                      Invalid URL
                    </Text>
                  )}
                  <Text size="sm" c="dimmed">
                    {w.shortSummary}
                  </Text>
                </Box>
              </Stack>
            </Paper>
          ))
        )}
      </Stack>
    </Container>
  );
}
