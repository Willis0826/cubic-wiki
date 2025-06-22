"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "ai/react";
import {
  ActionIcon,
  Paper,
  Text,
  TextInput,
  Button,
  Stack,
  Group,
  ScrollArea,
  Box,
  CloseButton,
  Loader,
} from "@mantine/core";
import { IconMessageCircle, IconSend, IconX } from "@tabler/icons-react";

interface ChatWidgetProps {
  wikiId: number;
}

export function ChatWidget({ wikiId }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      body: {
        wikiId,
      },
      maxSteps: 3, // Allow multi-step tool calls
    });

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(e);
  };

  return (
    <>
      {/* Toggle Button */}
      <ActionIcon
        size="xl"
        radius="xl"
        variant="filled"
        color="blue"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 1000,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        }}
      >
        {isOpen ? <IconX size={20} /> : <IconMessageCircle size={20} />}
      </ActionIcon>

      {/* Chat Dialog */}
      {isOpen && (
        <Paper
          shadow="xl"
          radius="md"
          p="md"
          style={{
            position: "fixed",
            bottom: "80px",
            right: "20px",
            width: "400px",
            height: "500px",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <Group justify="space-between" mb="md">
            <Text fw={600} size="lg">
              Ask about this wiki
            </Text>
            <CloseButton
              size="sm"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            />
          </Group>

          {/* Messages */}
          <ScrollArea
            ref={scrollAreaRef}
            flex={1}
            mb="md"
            style={{ minHeight: "300px" }}
          >
            <Stack gap="md">
              {messages.length === 0 && (
                <Text c="dimmed" ta="center" size="sm">
                  Ask me anything about this wiki page!
                </Text>
              )}
              {messages.map((message) => (
                <Box
                  key={message.id}
                  style={{
                    alignSelf:
                      message.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                  }}
                >
                  <Paper
                    p="xs"
                    bg={message.role === "user" ? "blue" : "gray.1"}
                    c={message.role === "user" ? "white" : "dark"}
                    radius="md"
                  >
                    <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                      {message.content.length > 0 ? (
                        message.content
                      ) : (
                        <span style={{ fontStyle: "italic", opacity: 0.7 }}>
                          {message.toolInvocations?.[0]
                            ? `Calling tool: ${message.toolInvocations[0].toolName}`
                            : "Thinking..."}
                        </span>
                      )}
                    </Text>
                  </Paper>
                </Box>
              ))}
              {isLoading && (
                <Box style={{ alignSelf: "flex-start" }}>
                  <Paper p="xs" bg="gray.1" radius="md">
                    <Group gap="xs">
                      <Loader size="xs" />
                      <Text size="sm" c="dimmed">
                        Thinking...
                      </Text>
                    </Group>
                  </Paper>
                </Box>
              )}
            </Stack>
          </ScrollArea>

          {/* Input */}
          <form onSubmit={onSubmit}>
            <Group gap="xs">
              <TextInput
                ref={inputRef}
                placeholder="Ask a question..."
                value={input}
                onChange={handleInputChange}
                disabled={isLoading}
                flex={1}
                size="sm"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                size="sm"
                leftSection={<IconSend size={16} />}
              >
                Send
              </Button>
            </Group>
          </form>
        </Paper>
      )}
    </>
  );
}
