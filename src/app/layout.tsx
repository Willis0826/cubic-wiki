import "@mantine/core/styles.css";

import React from "react";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import {
  ColorSchemeScript,
  mantineHtmlProps,
  MantineProvider,
  AppShell,
  AppShellMain,
} from "@mantine/core";
import { ReactQueryClientProvider } from "@/components/query-client/query-client";
import { theme } from "@/components/mantine-theme/mantine-theme";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { Notifications } from "@mantine/notifications";
import { Navigation } from "@/components/navigation/navigation";

export const metadata = { title: "Cubic Wiki" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <ReactQueryClientProvider>
          <MantineProvider theme={theme}>
            <Notifications />
            <AppShell header={{ height: 60 }}>
              <Navigation />
              <AppShellMain>{children}</AppShellMain>
            </AppShell>
          </MantineProvider>
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}
