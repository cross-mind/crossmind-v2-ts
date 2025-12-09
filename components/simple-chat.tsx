"use client";

import { Bot, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface SimpleChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SimpleChatProps {
  messages: SimpleChatMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  modelLabel?: string;
}

export function SimpleChat({
  messages,
  input,
  onInputChange,
  onSend,
  placeholder = "Type your question...",
  emptyStateTitle = "Start Conversation",
  emptyStateDescription = "AI assistant can help you analyze, understand, and refine content.",
  modelLabel = "Claude Sonnet 4.5",
}: SimpleChatProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-card/30">
      {/* Chat History */}
      <ScrollArea className="flex-1 p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-sm font-medium mb-2">{emptyStateTitle}</h3>
            <p className="text-xs text-muted-foreground max-w-sm">{emptyStateDescription}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="h-6 w-6 border border-border shrink-0">
                    <AvatarFallback className="text-[10px] bg-primary/10">
                      <Bot className="h-3 w-3 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-xs",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
                {message.role === "user" && (
                  <Avatar className="h-6 w-6 border border-border shrink-0">
                    <AvatarFallback className="text-[10px]">U</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Chat Input */}
      <div className="p-4 border-t border-border/50 bg-background/50">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full min-h-[80px] max-h-[200px] px-3 py-2 text-xs border border-border rounded-lg resize-none bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            style={{ paddingRight: "40px" }}
          />
          <Button
            size="icon"
            className="absolute right-2 bottom-2 h-7 w-7"
            onClick={onSend}
            disabled={!input.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-muted-foreground">Shift + Enter for new line · Enter to send</p>
          <Badge variant="outline" className="text-[10px]">
            <Sparkles className="h-2.5 w-2.5 mr-1" />
            {modelLabel}
          </Badge>
        </div>
      </div>
    </div>
  );
}
