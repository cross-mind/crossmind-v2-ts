import {
  Lightbulb,
  FileText,
  CheckSquare,
  Sparkles,
} from "lucide-react";

export const NODE_TYPE_CONFIG = {
  document: {
    icon: FileText,
    color: "bg-blue-500",
    label: "Document",
    emoji: "📄",
  },
  task: {
    icon: CheckSquare,
    color: "bg-gray-500",
    label: "Task",
    emoji: "☑️",
  },
  idea: {
    icon: Lightbulb,
    color: "bg-yellow-500",
    label: "Idea",
    emoji: "💡",
  },
  inspiration: {
    icon: Sparkles,
    color: "bg-pink-500",
    label: "Inspiration",
    emoji: "💡",
  },
} as const;

export type NodeType = keyof typeof NODE_TYPE_CONFIG;
