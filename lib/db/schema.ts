import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  json,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { AppUsage } from "../usage";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),

  // Subscription and usage tracking
  subscriptionTier: varchar("subscriptionTier", { enum: ["free", "basic", "pro"] }).notNull().default("free"),
  healthCheckUsage: jsonb("healthCheckUsage").$type<{
    month: string;  // "2025-12"
    count: number;  // Current month usage count
  }>(),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  lastContext: jsonb("lastContext").$type<AppUsage | null>(),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;

// ========== CrossMind Extensions ==========

// Projects
export const project = pgTable("Project", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("ownerId")
    .notNull()
    .references(() => user.id),
  workspaceContainerId: text("workspaceContainerId"),

  // Framework preference (added for framework independence)
  defaultFrameworkId: uuid("defaultFrameworkId"),

  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type Project = InferSelectModel<typeof project>;

// Project Memberships
export const membership = pgTable(
  "Membership",
  {
    projectId: uuid("projectId")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: varchar("role", { enum: ["owner", "member", "guest"] }).notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.userId] }),
  }),
);

export type Membership = InferSelectModel<typeof membership>;

// Canvas Nodes (Extended schema for production features)
export const canvasNode = pgTable("CanvasNode", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  projectId: uuid("projectId")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),

  // Core fields
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: varchar("type", { enum: ["document", "idea", "task", "inspiration"] })
    .notNull()
    .default("document"),

  // Hierarchy
  parentId: uuid("parentId").references((): any => canvasNode.id, { onDelete: "cascade" }),
  children: uuid("children").array(),
  references: uuid("references").array(),

  // Multi-framework positioning (stores positions for different frameworks)
  positions: jsonb("positions"),

  // Zone affinities (framework-to-zone weights for smart placement)
  zoneAffinities: jsonb("zoneAffinities"),

  // Tags
  tags: text("tags").array(),

  // Display order for sorting (used for drag-drop reordering)
  displayOrder: real("displayOrder").notNull().default(0),

  // Task-specific fields
  taskStatus: varchar("taskStatus", { enum: ["todo", "in-progress", "done"] }),
  assigneeId: uuid("assigneeId").references(() => user.id, { onDelete: "set null" }),
  dueDate: timestamp("dueDate"),

  // Inspiration-specific fields
  source: text("source"),
  capturedAt: timestamp("capturedAt"),

  // Health scoring (premium feature)
  healthScore: varchar("healthScore"),
  healthLevel: varchar("healthLevel", { enum: ["critical", "warning", "good", "excellent"] }),
  healthData: jsonb("healthData"),

  // Metadata
  createdById: uuid("createdById").references(() => user.id),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type CanvasNode = InferSelectModel<typeof canvasNode>;

// Canvas Node Activities
export const canvasNodeActivity = pgTable("CanvasNodeActivity", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  nodeId: uuid("nodeId")
    .notNull()
    .references(() => canvasNode.id, { onDelete: "cascade" }),
  projectId: uuid("projectId")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),

  userId: uuid("userId").references(() => user.id),
  type: varchar("type", {
    enum: ["created", "updated", "status_changed", "tag_added", "comment_added"],
  }).notNull(),
  description: text("description").notNull(),
  details: text("details"),

  createdAt: timestamp("createdAt").notNull(),
});

export type CanvasNodeActivity = InferSelectModel<typeof canvasNodeActivity>;

// Canvas Node Comments
export const canvasNodeComment = pgTable("CanvasNodeComment", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  nodeId: uuid("nodeId")
    .notNull()
    .references(() => canvasNode.id, { onDelete: "cascade" }),
  projectId: uuid("projectId")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),

  authorId: uuid("authorId").references(() => user.id),
  content: text("content").notNull(),
  mentions: uuid("mentions").array(),

  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type CanvasNodeComment = InferSelectModel<typeof canvasNodeComment>;

// Canvas Suggestions (AI-generated suggestions for improvement)
export const canvasSuggestion = pgTable("CanvasSuggestion", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  projectId: uuid("projectId")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),

  type: varchar("type", {
    enum: ["add-node", "add-tag", "refine-content", "health-issue"],
  }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  nodeId: uuid("nodeId").references(() => canvasNode.id, { onDelete: "set null" }),

  status: varchar("status", { enum: ["pending", "accepted", "dismissed"] })
    .notNull()
    .default("pending"),
  createdAt: timestamp("createdAt").notNull(),
});

export type CanvasSuggestion = InferSelectModel<typeof canvasSuggestion>;

// Tasks
export const task = pgTable("Task", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  projectId: uuid("projectId")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: varchar("status", {
    enum: ["todo", "in_progress", "blocked", "done"],
  })
    .notNull()
    .default("todo"),
  priority: varchar("priority", { enum: ["low", "medium", "high", "urgent"] }),
  assigneeId: uuid("assigneeId").references(() => user.id, {
    onDelete: "set null",
  }),
  createdById: uuid("createdById").references(() => user.id),
  dueDate: timestamp("dueDate"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type Task = InferSelectModel<typeof task>;

// Task Tags
export const taskTag = pgTable(
  "TaskTag",
  {
    taskId: uuid("taskId")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    namespace: text("namespace"),
    value: text("value").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.taskId, table.namespace, table.value],
    }),
  }),
);

export type TaskTag = InferSelectModel<typeof taskTag>;

// Canvas Node Tasks (junction table)
export const canvasNodeTask = pgTable(
  "CanvasNodeTask",
  {
    nodeId: uuid("nodeId")
      .notNull()
      .references(() => canvasNode.id, { onDelete: "cascade" }),
    taskId: uuid("taskId")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.nodeId, table.taskId] }),
  }),
);

export type CanvasNodeTask = InferSelectModel<typeof canvasNodeTask>;

// Task Comments
export const taskComment = pgTable("TaskComment", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  taskId: uuid("taskId")
    .notNull()
    .references(() => task.id, { onDelete: "cascade" }),
  authorId: uuid("authorId").references(() => user.id),
  authorType: varchar("authorType", { enum: ["user", "agent"] }),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type TaskComment = InferSelectModel<typeof taskComment>;

// Task Activity
export const taskActivity = pgTable("TaskActivity", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  taskId: uuid("taskId")
    .notNull()
    .references(() => task.id, { onDelete: "cascade" }),
  actorId: uuid("actorId").references(() => user.id),
  actorType: varchar("actorType", { enum: ["user", "agent"] }),
  action: text("action").notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").notNull(),
});

export type TaskActivity = InferSelectModel<typeof taskActivity>;

// Agent Services
export const agentService = pgTable("AgentService", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  provider: text("provider").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  inputSchema: jsonb("inputSchema").notNull(),
  requiredPermissions: text("requiredPermissions").array(),
  outputTypes: text("outputTypes").array(),
  maxIterations: varchar("maxIterations").default("3"),
  pricing: jsonb("pricing"),
  createdAt: timestamp("createdAt").notNull(),
});

export type AgentService = InferSelectModel<typeof agentService>;

// Agent Orders
export const agentOrder = pgTable("AgentOrder", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  projectId: uuid("projectId")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  serviceId: uuid("serviceId").references(() => agentService.id),
  userInput: jsonb("userInput").notNull(),
  status: varchar("status", {
    enum: ["pending", "running", "awaiting_feedback", "completed", "cancelled"],
  })
    .notNull()
    .default("pending"),
  currentIteration: varchar("currentIteration").default("0"),
  workspaceContainerId: text("workspaceContainerId"),
  createdById: uuid("createdById").references(() => user.id),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type AgentOrder = InferSelectModel<typeof agentOrder>;

// Agent Order Feedback
export const agentOrderFeedback = pgTable("AgentOrderFeedback", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  orderId: uuid("orderId")
    .notNull()
    .references(() => agentOrder.id, { onDelete: "cascade" }),
  feedbackText: text("feedbackText").notNull(),
  createdById: uuid("createdById").references(() => user.id),
  createdAt: timestamp("createdAt").notNull(),
});

export type AgentOrderFeedback = InferSelectModel<typeof agentOrderFeedback>;

// Agent Identities
export const agentIdentity = pgTable("AgentIdentity", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  orderId: uuid("orderId")
    .notNull()
    .references(() => agentOrder.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").notNull(),
});

export type AgentIdentity = InferSelectModel<typeof agentIdentity>;

// Agent Service Reviews
export const agentServiceReview = pgTable("AgentServiceReview", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  orderId: uuid("orderId")
    .notNull()
    .references(() => agentOrder.id, { onDelete: "cascade" }),
  rating: varchar("rating"),
  comment: text("comment"),
  createdAt: timestamp("createdAt").notNull(),
});

export type AgentServiceReview = InferSelectModel<typeof agentServiceReview>;

// Project Documents (for RAG)
export const projectDocument = pgTable("ProjectDocument", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  projectId: uuid("projectId")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sourceType: varchar("sourceType", {
    enum: ["canvas", "task", "agent", "chat"],
  }),
  sourceId: uuid("sourceId"),
  embedding: text("embedding"), // Store as text for now, can be converted to pgvector later
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type ProjectDocument = InferSelectModel<typeof projectDocument>;

// Chat Sessions (project-specific)
export const chatSession = pgTable("ChatSession", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  projectId: uuid("projectId")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  userId: uuid("userId").references(() => user.id),
  canvasNodeId: uuid("canvasNodeId").references(() => canvasNode.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("createdAt").notNull(),
});

export type ChatSession = InferSelectModel<typeof chatSession>;

// ========== Framework System ==========

// Framework table (platform-shared and user-custom frameworks)
export const framework = pgTable(
  "Framework",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    name: text("name").notNull(),
    icon: text("icon").notNull(),
    description: text("description").notNull(),

    // Multi-tenancy: NULL = platform-shared
    ownerId: uuid("ownerId").references(() => user.id, { onDelete: "cascade" }),

    visibility: varchar("visibility", { enum: ["public", "private"] })
      .notNull()
      .default("private"),
    isActive: boolean("isActive").notNull().default(true),

    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => ({
    ownerIdx: index("idx_framework_owner").on(table.ownerId, table.isActive),
  })
);

export type Framework = InferSelectModel<typeof framework>;

// FrameworkZone table (normalized zones belonging to frameworks)
export const frameworkZone = pgTable(
  "FrameworkZone",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    frameworkId: uuid("frameworkId")
      .notNull()
      .references(() => framework.id, { onDelete: "cascade" }),

    zoneKey: text("zoneKey").notNull(), // Stable identifier (e.g., "ideation")
    name: text("name").notNull(), // Display name (e.g., "想法孵化")
    description: text("description"),
    colorKey: text("colorKey").notNull(), // References ZONE_COLORS constant

    displayOrder: real("displayOrder").notNull().default(0), // Left-to-right order

    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    uniqueZone: uniqueIndex("idx_framework_zone_unique").on(
      table.frameworkId,
      table.zoneKey
    ),
    orderIdx: index("idx_framework_zone_order").on(
      table.frameworkId,
      table.displayOrder
    ),
  })
);

export type FrameworkZone = InferSelectModel<typeof frameworkZone>;

// CanvasNodeZoneAffinity table (normalized node-zone relationships)
export const canvasNodeZoneAffinity = pgTable(
  "CanvasNodeZoneAffinity",
  {
    nodeId: uuid("nodeId")
      .notNull()
      .references(() => canvasNode.id, { onDelete: "cascade" }),
    frameworkId: uuid("frameworkId")
      .notNull()
      .references(() => framework.id, { onDelete: "cascade" }),
    zoneId: uuid("zoneId")
      .notNull()
      .references(() => frameworkZone.id, { onDelete: "cascade" }),

    affinityWeight: real("affinityWeight").notNull(), // 1-10 scale

    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.nodeId, table.frameworkId, table.zoneId] }),
    lookupIdx: index("idx_affinity_lookup").on(
      table.nodeId,
      table.frameworkId,
      table.affinityWeight
    ),
    zoneNodesIdx: index("idx_zone_nodes").on(
      table.frameworkId,
      table.zoneId,
      table.affinityWeight
    ),
  })
);

export type CanvasNodeZoneAffinity = InferSelectModel<typeof canvasNodeZoneAffinity>;

// CanvasNodePosition table (stores node positions per framework)
export const canvasNodePosition = pgTable(
  "CanvasNodePosition",
  {
    nodeId: uuid("nodeId")
      .notNull()
      .references(() => canvasNode.id, { onDelete: "cascade" }),
    frameworkId: uuid("frameworkId")
      .notNull()
      .references(() => framework.id, { onDelete: "cascade" }),

    x: real("x").notNull(),
    y: real("y").notNull(),

    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.nodeId, table.frameworkId] }),
    frameworkIdx: index("idx_node_position_framework").on(table.frameworkId),
  })
);

export type CanvasNodePosition = InferSelectModel<typeof canvasNodePosition>;
