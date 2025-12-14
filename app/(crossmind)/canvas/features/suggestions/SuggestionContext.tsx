"use client";

/**
 * Suggestion Context
 *
 * Manages AI suggestions state for Canvas nodes.
 * Provides suggestion data and actions.
 */

import React, { createContext, useContext, useMemo } from "react";
import type { CanvasSuggestion } from "@/lib/db/schema";

export interface SuggestionState {
  // Suggestion data
  suggestionsByNode: Map<string, CanvasSuggestion[]>;
  isGenerating: boolean;
  elapsedTime: number;

  // Actions
  applySuggestion: (suggestionId: string) => Promise<void>;
  dismissSuggestion: (suggestionId: string) => Promise<void>;
}

const SuggestionContext = createContext<SuggestionState | null>(null);

export interface SuggestionProviderProps {
  children: React.ReactNode;
  suggestionsByNode: Map<string, CanvasSuggestion[]>;
  isGenerating?: boolean;
  elapsedTime?: number;
  onApplySuggestion?: (suggestionId: string) => Promise<void>;
  onDismissSuggestion?: (suggestionId: string) => Promise<void>;
}

export function SuggestionProvider({
  children,
  suggestionsByNode,
  isGenerating = false,
  elapsedTime = 0,
  onApplySuggestion,
  onDismissSuggestion,
}: SuggestionProviderProps) {
  const applySuggestion = async (suggestionId: string) => {
    if (onApplySuggestion) {
      await onApplySuggestion(suggestionId);
    }
  };

  const dismissSuggestion = async (suggestionId: string) => {
    if (onDismissSuggestion) {
      await onDismissSuggestion(suggestionId);
    }
  };

  const value = useMemo<SuggestionState>(
    () => ({
      suggestionsByNode,
      isGenerating,
      elapsedTime,
      applySuggestion,
      dismissSuggestion,
    }),
    [suggestionsByNode, isGenerating, elapsedTime]
  );

  return <SuggestionContext.Provider value={value}>{children}</SuggestionContext.Provider>;
}

export function useSuggestions() {
  const context = useContext(SuggestionContext);
  if (!context) {
    throw new Error("useSuggestions must be used within SuggestionProvider");
  }
  return context;
}
