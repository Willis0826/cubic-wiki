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
                  Repo: <Anchor href={w.repoUrl}>{w.repoUrl}</Anchor>
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
