import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  json,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { AppUsage } from "../usage";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
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
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type Project = InferSelectModel<typeof project>;

// Project Memberships
export const membership = pgTable(
  "Membership",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
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
    uniqueProjectUser: primaryKey({ columns: [table.projectId, table.userId] }),
  }),
);

export type Membership = InferSelectModel<typeof membership>;

// Canvas Nodes
export const canvasNode = pgTable("CanvasNode", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  projectId: uuid("projectId")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags").array(),
  positionX: varchar("positionX"),
  positionY: varchar("positionY"),
  status: varchar("status", {
    enum: ["not_started", "in_progress", "blocked", "completed"],
  }),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export type CanvasNode = InferSelectModel<typeof canvasNode>;

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
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    taskId: uuid("taskId")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    namespace: text("namespace"),
    value: text("value").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    uniqueTaskTag: primaryKey({
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
