import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from "ai";
import { isTestEnvironment } from "../constants";

// Configure OpenRouter with official provider for better tool calling support
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const myProvider = isTestEnvironment
  ? (() => {
      const { artifactModel, chatModel, reasoningModel, titleModel } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        // Using Claude Sonnet 4 via OpenRouter official provider (proper tool calling support)
        "chat-model": openrouter.chat("anthropic/claude-sonnet-4"),
        "chat-model-reasoning": wrapLanguageModel({
          model: openrouter.chat("anthropic/claude-sonnet-4"),
          middleware: extractReasoningMiddleware({ tagName: "thinking" }),
        }),
        "title-model": openrouter.chat("anthropic/claude-sonnet-4"),
        "artifact-model": openrouter.chat("anthropic/claude-sonnet-4"),
      },
    });
