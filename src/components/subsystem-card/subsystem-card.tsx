"use client";

import { useState, useEffect, useRef } from "react";
import {
  Paper,
  Title,
  Text,
  ScrollArea,
  Flex,
  Anchor,
  Stack,
  Box,
  Group,
  Code,
} from "@mantine/core";
import { IconBrain, IconSparkles } from "@tabler/icons-react";
import { GetMoreInsightsButton } from "./components/get-more-insights-button/get-more-insights-button";
import Markdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";

// Mermaid component for rendering diagrams
function MermaidDiagram({ chart }: { chart: string }) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elementRef.current) {
      // Initialize mermaid
      mermaid.initialize({
        startOnLoad: true,
        theme: "default",
        securityLevel: "loose",
      });

      // Clear previous content
      elementRef.current.innerHTML = "";

      // Render the chart
      mermaid
        .render("mermaid-" + Math.random().toString(36).substr(2, 9), chart)
        .then(({ svg }) => {
          elementRef.current!.innerHTML = svg;
        })
        .catch((error) => {
          console.error("Mermaid rendering error:", error);
          elementRef.current!.innerHTML = "<p>Error rendering diagram</p>";
        });
    }
  }, [chart]);

  return (
    <Box
      ref={elementRef}
      style={{
        display: "flex",
        justifyContent: "center",
        margin: "1rem 0",
        overflow: "auto",
      }}
    />
  );
}

type SubsystemCardProps = {
  subsystem: {
    id: number;
    title: string;
    shortSummary: string;
    summary: string | null;
    files: any;
  };
  repoUrl: string;
  branch: string;
};

export function SubsystemCard({
  subsystem,
  repoUrl,
  branch,
}: SubsystemCardProps) {
  const [summary, setSummary] = useState<string | null>(subsystem.summary);

  const components: Components = {
    code({ node, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      const isInline = !match;
      const language = match ? match[1] : "";

      // Handle Mermaid diagrams
      if (language === "mermaid") {
        return <MermaidDiagram chart={children?.toString() || ""} />;
      }

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
    <Paper p="sm" withBorder>
      <Stack gap="xs">
        <Title order={4}>{subsystem.title}</Title>
        <Text size="sm">{subsystem.shortSummary}</Text>

        {/* AI Analysis section - only show if no summary exists */}
        {!summary && (
          <Box
            p="md"
            bg="linear-gradient(135deg,rgb(73, 100, 219) 0%,rgb(104, 89, 219) 100%)"
            style={{
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <Stack gap="xs" style={{ position: "relative", zIndex: 1 }}>
              <Group gap="xs" align="center">
                <IconBrain size={20} color="white" />
                <Text size="sm" fw={600} c="white">
                  AI Analysis Available
                </Text>
                <IconSparkles size={16} color="white" />
              </Group>

              <Text size="xs" c="white" opacity={0.9}>
                Get detailed insights about this subsystem's architecture,
                patterns, and recommendations
              </Text>

              <GetMoreInsightsButton
                subsystemId={subsystem.id}
                setSummary={setSummary}
              />
            </Stack>
          </Box>
        )}

        {/* Display summary if it exists */}
        {summary && (
          <Markdown remarkPlugins={[remarkGfm]} components={components}>
            {summary}
          </Markdown>
        )}

        {/* Files */}
        <div>
          <Text size="xs" c="dimmed">
            Files:
          </Text>
          <ScrollArea mah={200}>
            <Flex direction="column">
              {Array.isArray(subsystem.files) &&
                subsystem.files.map((file: any, index: number) => (
                  <Anchor
                    key={index}
                    href={`${repoUrl}/blob/${branch}/${file?.toString()}`}
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
  );
}
