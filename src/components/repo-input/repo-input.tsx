"use client";

import { Button, Container, TextInput, Title } from "@mantine/core";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { showNotification } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

type FormValues = {
  repoUrl: string;
};

export default function RepoInput() {
  const { register, handleSubmit, formState } = useForm<FormValues>({
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

  return (
    <Container size="xs" mt="lg">
      <Title order={2} mb="md">
        🔍 Generate Wiki
      </Title>
      <form onSubmit={handleSubmit(onSubmit)}>
        <TextInput
          label="GitHub Repository URL"
          placeholder="https://github.com/user/repo"
          {...register("repoUrl", { required: true })}
          error={formState.errors.repoUrl && "Repo URL is required"}
          mb="sm"
        />
        <Button fullWidth type="submit" loading={formState.isSubmitting}>
          Cubic Read →
        </Button>
      </form>
    </Container>
  );
}
