"use client";

import { useState } from "react";
import { Button, Loader } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBrain } from "@tabler/icons-react";

type GetMoreInsightsButtonProps = {
  subsystemId: number;
  setSummary: (summary: string) => void;
};

export function GetMoreInsightsButton({
  subsystemId,
  setSummary,
}: GetMoreInsightsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/generate-subsystem-summary", {
        method: "POST",
        body: JSON.stringify({ subsystemId }),
      });

      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        notifications.show({
          title: "Success!",
          message: "Insights generated successfully",
          color: "green",
        });
      } else {
        notifications.show({
          title: "Error",
          message: "Failed to generate insights. Please try again.",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Failed to generate summary:", error);
      notifications.show({
        title: "Error",
        message: "Something went wrong. Please try again.",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="white"
      size="xs"
      leftSection={<IconBrain size={14} />}
      style={{
        alignSelf: "flex-start",
        color: "#667eea",
        fontWeight: 600,
      }}
      disabled={isLoading}
      onClick={handleClick}
    >
      {isLoading ? <Loader size="xs" /> : "Get More Insights"}
    </Button>
  );
}
