export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Claude Sonnet 4",
    description: "Advanced AI model with excellent tool calling and reasoning capabilities",
  },
  {
    id: "chat-model-reasoning",
    name: "Claude Sonnet 4 (Reasoning)",
    description: "Uses extended chain-of-thought reasoning for complex problems",
  },
];
