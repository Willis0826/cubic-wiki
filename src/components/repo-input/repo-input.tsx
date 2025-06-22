"use client";

import {
  Badge,
  Button,
  Container,
  Divider,
  Flex,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { showNotification } from "@mantine/notifications";
import { IconCheck, IconLoader, IconX } from "@tabler/icons-react";

type FormValues = {
  repoUrl: string;
};

export default function RepoInput() {
  const basicForm = useForm<FormValues>({
    defaultValues: {
      repoUrl: "https://github.com/Textualize/rich-cli",
    },
  });

  const proForm = useForm<FormValues>({
    defaultValues: {
      repoUrl: "https://github.com/Textualize/rich-cli",
    },
  });

  const router = useRouter();

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({ repoUrl: data.repoUrl }),
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Failed to generate");

      showNotification({
        title: "Success",
        message: "Documentation generated!",
        color: "green",
        icon: <IconCheck />,
      });

      router.push(`/wiki/${json.id}`);
    } catch (err: unknown) {
      showNotification({
        title: "Error",
        message: err instanceof Error ? err.message : "Something went wrong",
        color: "red",
        icon: <IconX />,
      });
    }
  };

  const onSubmitV2 = async (data: FormValues) => {
    try {
      showNotification({
        title: "Generating...",
        message:
          "We are preparing the documentation for you, this may take a while",
        color: "blue",
        icon: <IconLoader />,
      });
      const res = await fetch("/api/generate-v2", {
        method: "POST",
        body: JSON.stringify({ repoUrl: data.repoUrl }),
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Failed to generate");

      showNotification({
        title: "Success",
        message: "Documentation generated!",
        color: "green",
        icon: <IconCheck />,
      });

      router.push(`/wiki/${json.id}`);
    } catch (err: unknown) {
      showNotification({
        title: "Error",
        message: err instanceof Error ? err.message : "Something went wrong",
        color: "red",
        icon: <IconX />,
      });
    }
  };

  return (
    <Container size="xs" mt="lg">
      {/* V1 */}
      <Title order={2} mb="md">
        🔍 Generate Wiki
      </Title>
      <Text mb="md" c="dimmed">
        Using file names and readme to generate multiple subsystems. <br />
        This is cheaper but less accurate.
      </Text>
      <form onSubmit={basicForm.handleSubmit(onSubmit)}>
        <TextInput
          label="GitHub Repository URL"
          placeholder="https://github.com/user/repo"
          {...basicForm.register("repoUrl", { required: true })}
          error={basicForm.formState.errors.repoUrl && "Repo URL is required"}
          mb="sm"
        />
        <Button
          fullWidth
          type="submit"
          loading={basicForm.formState.isSubmitting}
        >
          Cubic Read →
        </Button>
      </form>

      <Divider my="lg" />

      {/* V2 */}
      <Flex align="center" mb="md">
        <Title order={2}>✨ Generate Wiki</Title>
        <Badge
          ml="sm"
          variant="gradient"
          gradient={{ from: "blue", to: "cyan", deg: 90 }}
        >
          Pro
        </Badge>
      </Flex>

      <Text mb="md" c="dimmed">
        Indexing the entire codebase to generate accurate documentation. <br />
        Using file content to generate multiple subsystems. <br />
        This is more accurate but more expensive.
      </Text>
      <form onSubmit={proForm.handleSubmit(onSubmitV2)}>
        <TextInput
          label="GitHub Repository URL"
          placeholder="https://github.com/user/repo"
          {...proForm.register("repoUrl", { required: true })}
          error={proForm.formState.errors.repoUrl && "Repo URL is required"}
          mb="sm"
        />
        <Button
          fullWidth
          type="submit"
          loading={proForm.formState.isSubmitting}
          variant="gradient"
          gradient={{ from: "blue", to: "cyan", deg: 90 }}
        >
          Cubic Read →
        </Button>
      </form>
    </Container>
  );
}
