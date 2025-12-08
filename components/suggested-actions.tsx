"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { motion } from "framer-motion";
import { memo } from "react";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "./elements/suggestion";
import type { VisibilityType } from "./visibility-selector";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
};

function PureSuggestedActions({ chatId, sendMessage }: SuggestedActionsProps) {
  const suggestedActions = [
    "Help me brainstorm features for a SaaS product",
    "Generate a PRD for a mobile app idea",
    "Break down this feature into development tasks",
    "What are best practices for API design?",
  ];

  return (
    <div className="grid w-full gap-2 sm:grid-cols-2" data-testid="suggested-actions">
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
          key={suggestedAction}
          transition={{ delay: 0.05 * index, duration: 0.3 }}
        >
          <Suggestion
            className="h-auto w-full whitespace-normal rounded-lg border bg-card px-4 py-3 text-left text-sm hover:bg-accent/50 transition-colors"
            onClick={(suggestion) => {
              window.history.pushState({}, "", `/chat/${chatId}`);
              sendMessage({
                role: "user",
                parts: [{ type: "text", text: suggestion }],
              });
            }}
            suggestion={suggestedAction}
          >
            {suggestedAction}
          </Suggestion>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, (prevProps, nextProps) => {
  if (prevProps.chatId !== nextProps.chatId) {
    return false;
  }
  if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
    return false;
  }

  return true;
});
