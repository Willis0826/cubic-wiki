"use client";

import { AppShell, Group, Button, Title } from "@mantine/core";
import { useRouter, usePathname } from "next/navigation";

export function Navigation() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <AppShell.Header p="md">
      <Group justify="space-between" align="center" h="100%">
        <Title order={1} size="h3" c="blue">
          Cubic Wiki
        </Title>

        <Group gap="sm">
          <Button
            variant={pathname === "/" ? "filled" : "light"}
            onClick={() => router.push("/")}
            size="sm"
          >
            Home
          </Button>
          <Button
            variant={pathname === "/wiki" ? "filled" : "light"}
            onClick={() => router.push("/wiki")}
            size="sm"
          >
            Wiki
          </Button>
        </Group>
      </Group>
    </AppShell.Header>
  );
}
