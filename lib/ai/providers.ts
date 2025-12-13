import { createOpenAI } from "@ai-sdk/openai";
import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from "ai";
import { isTestEnvironment } from "../constants";

// Configure OpenRouter
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": "https://crossmind.app", // Optional: for OpenRouter rankings
    "X-Title": "CrossMind", // Optional: shows in OpenRouter dashboard
  },
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
        // Using Claude Sonnet 4.5 via OpenRouter
        "chat-model": openrouter("anthropic/claude-sonnet-4.5"),
        "chat-model-reasoning": wrapLanguageModel({
          model: openrouter("anthropic/claude-sonnet-4.5"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "title-model": openrouter("anthropic/claude-sonnet-4.5"),
        "artifact-model": openrouter("anthropic/claude-sonnet-4.5"),
      },
    });
