"use client";

import { useState } from "react";
import { Button } from "@mantine/core";
import { IconBrain } from "@tabler/icons-react";

type InteractiveInsightsButtonProps = {
  subsystemId: number;
};

export function InteractiveInsightsButton({
  subsystemId,
}: InteractiveInsightsButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Button
      variant="white"
      size="xs"
      leftSection={<IconBrain size={14} />}
      style={{
        alignSelf: "flex-start",
        background: "rgba(255, 255, 255, 0.9)",
        color: "#667eea",
        fontWeight: 600,
        boxShadow: isHovered
          ? "0 6px 20px rgba(0, 0, 0, 0.2)"
          : "0 4px 12px rgba(0, 0, 0, 0.15)",
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        // TODO: call the generate-subsystem-summary endpoint
        console.log("clicked");
      }}
    >
      Get More Insights
    </Button>
  );
}
