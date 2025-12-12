import "server-only";

import { and, asc, count, desc, eq, gt, gte, inArray, lt, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import type { AppUsage } from "../usage";
import { generateUUID } from "../utils";
import {
  type Chat,
  chat,
  type DBMessage,
  document,
  message,
  type Suggestion,
  stream,
  suggestion,
  type User,
  user,
  vote,
  canvasNode,
  type CanvasNode,
  canvasNodeActivity,
  type CanvasNodeActivity,
  canvasNodeComment,
  type CanvasNodeComment,
  canvasSuggestion,
  project,
  type Project,
  membership,
  type Membership,
} from "./schema";
import { generateHashedPassword } from "./utils";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get user by email");
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create guest user");
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db.delete(chat).where(eq(chat.id, id)).returning();
    return chatsDeleted;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to delete chat by id");
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await db.select({ id: chat.id }).from(chat).where(eq(chat.userId, userId));

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    await db.delete(vote).where(inArray(vote.chatId, chatIds));
    await db.delete(message).where(inArray(message.chatId, chatIds));
    await db.delete(stream).where(inArray(stream.chatId, chatIds));

    const deletedChats = await db.delete(chat).where(eq(chat.userId, userId)).returning();

    return { deletedCount: deletedChats.length };
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to delete all chats by user id");
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(whereCondition ? and(whereCondition, eq(chat.userId, id)) : eq(chat.userId, id))
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError("not_found:database", `Chat with id ${startingAfter} not found`);
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db.select().from(chat).where(eq(chat.id, endingBefore)).limit(1);

      if (!selectedChat) {
        throw new ChatSDKError("not_found:database", `Chat with id ${endingBefore} not found`);
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chats by user id");
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    return await db.insert(message).values(messages);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save messages");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get messages by chat id");
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get votes by chat id");
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save document");
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get documents by id");
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get document by id");
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(and(eq(suggestion.documentId, id), gt(suggestion.documentCreatedAt, timestamp)));

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp",
    );
  }
}

export async function saveSuggestions({ suggestions }: { suggestions: Suggestion[] }) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to save suggestions");
  }
}

export async function getSuggestionsByDocumentId({ documentId }: { documentId: string }) {
  try {
    return await db.select().from(suggestion).where(eq(suggestion.documentId, documentId));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get suggestions by document id");
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get message by id");
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)));

    const messageIds = messagesToDelete.map((currentMessage) => currentMessage.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)));

      return await db
        .delete(message)
        .where(and(eq(message.chatId, chatId), inArray(message.id, messageIds)));
    }
  } catch (_error) {
    throw new ChatSDKError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp",
    );
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update chat visibility by id");
  }
}

export async function updateChatLastContextById({
  chatId,
  context,
}: {
  chatId: string;
  // Store merged server-enriched usage object
  context: AppUsage;
}) {
  try {
    return await db.update(chat).set({ lastContext: context }).where(eq(chat.id, chatId));
  } catch (error) {
    console.warn("Failed to update lastContext for chat", chatId, error);
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - differenceInHours * 60 * 60 * 1000);

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, "user"),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get message count by user id");
  }
}

export async function createStreamId({ streamId, chatId }: { streamId: string; chatId: string }) {
  try {
    await db.insert(stream).values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create stream id");
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get stream ids by chat id");
  }
}

// ========== Canvas Node Queries ==========

export async function getCanvasNodesByProjectId({ projectId }: { projectId: string }) {
  try {
    // Explicitly select all fields to ensure parentId is included
    // (Drizzle has issues with self-referencing foreign keys when using .select())
    return await db
      .select({
        id: canvasNode.id,
        projectId: canvasNode.projectId,
        title: canvasNode.title,
        content: canvasNode.content,
        type: canvasNode.type,
        parentId: canvasNode.parentId,  // Explicitly include parentId
        children: canvasNode.children,
        references: canvasNode.references,
        positions: canvasNode.positions,
        zoneAffinities: canvasNode.zoneAffinities,
        tags: canvasNode.tags,
        displayOrder: canvasNode.displayOrder,  // Added for drag-drop sorting
        healthScore: canvasNode.healthScore,
        healthLevel: canvasNode.healthLevel,
        healthData: canvasNode.healthData,
        taskStatus: canvasNode.taskStatus,
        assigneeId: canvasNode.assigneeId,
        dueDate: canvasNode.dueDate,
        source: canvasNode.source,
        capturedAt: canvasNode.capturedAt,
        createdById: canvasNode.createdById,
        createdAt: canvasNode.createdAt,
        updatedAt: canvasNode.updatedAt,
      })
      .from(canvasNode)
      .where(eq(canvasNode.projectId, projectId))
      .orderBy(asc(canvasNode.displayOrder));  // Sort by displayOrder instead of createdAt
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get canvas nodes");
  }
}

export async function getCanvasNodeById({ id }: { id: string }) {
  try {
    const [node] = await db.select().from(canvasNode).where(eq(canvasNode.id, id));
    return node;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get canvas node");
  }
}

export async function createCanvasNode({
  projectId,
  title,
  content,
  type,
  parentId,
  tags,
  positions,
  zoneAffinities,
  taskStatus,
  assigneeId,
  dueDate,
  source,
  capturedAt,
  createdById,
}: {
  projectId: string;
  title: string;
  content: string;
  type: "document" | "idea" | "task" | "inspiration";
  parentId?: string;
  tags?: string[];
  positions?: Record<string, { x: number; y: number }>;
  zoneAffinities?: Record<string, Record<string, number>>;
  taskStatus?: "todo" | "in-progress" | "done";
  assigneeId?: string;
  dueDate?: Date;
  source?: string;
  capturedAt?: Date;
  createdById: string;
}) {
  try {
    const [newNode] = await db
      .insert(canvasNode)
      .values({
        projectId,
        title,
        content,
        type,
        parentId,
        tags,
        positions,
        zoneAffinities,
        taskStatus,
        assigneeId,
        dueDate,
        source,
        capturedAt,
        createdById,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Automatically create activity record
    await db.insert(canvasNodeActivity).values({
      nodeId: newNode.id,
      projectId,
      userId: createdById,
      type: "created",
      description: "created this node",
      createdAt: new Date(),
    });

    return newNode;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create canvas node");
  }
}

export async function updateCanvasNode({
  id,
  title,
  content,
  positions,
  tags,
  displayOrder,
  parentId,
  zoneAffinities,
  taskStatus,
  assigneeId,
  dueDate,
  healthScore,
  healthLevel,
  healthData,
}: {
  id: string;
  title?: string;
  content?: string;
  positions?: Record<string, { x: number; y: number }>;
  tags?: string[];
  displayOrder?: number;
  parentId?: string | null;
  zoneAffinities?: Record<string, Record<string, number>>;
  taskStatus?: "todo" | "in-progress" | "done";
  assigneeId?: string;
  dueDate?: Date;
  healthScore?: string;
  healthLevel?: "critical" | "warning" | "good" | "excellent";
  healthData?: any;
}) {
  try {
    const [updated] = await db
      .update(canvasNode)
      .set({
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(positions !== undefined && { positions }),
        ...(tags !== undefined && { tags }),
        ...(displayOrder !== undefined && { displayOrder }),
        ...(parentId !== undefined && { parentId }),
        ...(zoneAffinities !== undefined && { zoneAffinities }),
        ...(taskStatus !== undefined && { taskStatus }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(dueDate !== undefined && { dueDate }),
        ...(healthScore !== undefined && { healthScore }),
        ...(healthLevel !== undefined && { healthLevel }),
        ...(healthData !== undefined && { healthData }),
        updatedAt: new Date(),
      })
      .where(eq(canvasNode.id, id))
      .returning();

    return updated;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update canvas node");
  }
}

export async function deleteCanvasNode({ id }: { id: string }) {
  try {
    // Cascade delete will handle activities, comments automatically
    const [deleted] = await db.delete(canvasNode).where(eq(canvasNode.id, id)).returning();
    return deleted;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to delete canvas node");
  }
}

// ========== Canvas Activities ==========

export async function getCanvasActivities({ nodeId }: { nodeId: string }) {
  try {
    return await db
      .select()
      .from(canvasNodeActivity)
      .where(eq(canvasNodeActivity.nodeId, nodeId))
      .orderBy(desc(canvasNodeActivity.createdAt));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get activities");
  }
}

export async function createCanvasActivity({
  nodeId,
  projectId,
  userId,
  type,
  description,
  details,
}: {
  nodeId: string;
  projectId: string;
  userId: string;
  type: "created" | "updated" | "status_changed" | "tag_added" | "comment_added";
  description: string;
  details?: string;
}) {
  try {
    const [newActivity] = await db
      .insert(canvasNodeActivity)
      .values({
        nodeId,
        projectId,
        userId,
        type,
        description,
        details,
        createdAt: new Date(),
      })
      .returning();

    return newActivity;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create activity");
  }
}

// ========== Canvas Comments ==========

export async function getCanvasComments({ nodeId }: { nodeId: string }) {
  try {
    return await db
      .select()
      .from(canvasNodeComment)
      .where(eq(canvasNodeComment.nodeId, nodeId))
      .orderBy(asc(canvasNodeComment.createdAt));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get comments");
  }
}

export async function createCanvasComment({
  nodeId,
  projectId,
  authorId,
  content,
  mentions,
}: {
  nodeId: string;
  projectId: string;
  authorId: string;
  content: string;
  mentions?: string[];
}) {
  try {
    const [newComment] = await db
      .insert(canvasNodeComment)
      .values({
        nodeId,
        projectId,
        authorId,
        content,
        mentions,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Also create activity record
    await db.insert(canvasNodeActivity).values({
      nodeId,
      projectId,
      userId: authorId,
      type: "comment_added",
      description: "added a comment",
      createdAt: new Date(),
    });

    return newComment;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create comment");
  }
}

// ========== Health Scoring ==========

export async function updateHealthScore({
  id,
  healthScore,
  healthLevel,
  healthData,
}: {
  id: string;
  healthScore: number;
  healthLevel: "critical" | "warning" | "good" | "excellent";
  healthData: any;
}) {
  try {
    const [updated] = await db
      .update(canvasNode)
      .set({
        healthScore: healthScore.toString(),
        healthLevel,
        healthData,
        updatedAt: new Date(),
      })
      .where(eq(canvasNode.id, id))
      .returning();

    return updated;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update health score");
  }
}

// ========== Health Check Usage Tracking ==========

export async function getUserById({ id }: { id: string }) {
  try {
    const [foundUser] = await db.select().from(user).where(eq(user.id, id));
    return foundUser;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get user by id");
  }
}

export async function getHealthCheckUsage({ userId }: { userId: string }) {
  try {
    const foundUser = await getUserById({ id: userId });
    if (!foundUser) throw new Error("User not found");

    const currentMonth = new Date().toISOString().slice(0, 7); // "2025-12"
    const usage = foundUser.healthCheckUsage;

    // If it's a new month, reset count
    if (!usage || usage.month !== currentMonth) {
      return { month: currentMonth, count: 0 };
    }

    return usage;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get health check usage");
  }
}

export async function incrementHealthCheckUsage({ userId }: { userId: string }) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = await getHealthCheckUsage({ userId });

    // Increment count
    await db
      .update(user)
      .set({
        healthCheckUsage: {
          month: currentMonth,
          count: usage.count + 1,
        },
      })
      .where(eq(user.id, userId));

    return { month: currentMonth, count: usage.count + 1 };
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to increment health check usage");
  }
}

// Subscription limits configuration
export const SUBSCRIPTION_LIMITS = {
  free: { healthChecks: 0 }, // Not available
  basic: { healthChecks: 100 }, // 100 checks per month
  pro: { healthChecks: 500 }, // 500 checks per month
};

// =============================================================================
// Project Management
// =============================================================================

/**
 * Get all projects for a user (owner + member)
 */
export async function getProjectsByUserId({ userId }: { userId: string }) {
  try {
    return await db
      .select({
        id: project.id,
        name: project.name,
        description: project.description,
        ownerId: project.ownerId,
        workspaceContainerId: project.workspaceContainerId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        role: membership.role,
      })
      .from(project)
      .innerJoin(membership, eq(membership.projectId, project.id))
      .where(eq(membership.userId, userId))
      .orderBy(desc(project.updatedAt));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get projects by user ID");
  }
}

/**
 * Get a single project by ID
 */
export async function getProjectById({ projectId }: { projectId: string }) {
  try {
    const result = await db
      .select()
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1);
    return result[0] || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get project by ID");
  }
}

/**
 * Create a new project
 */
export async function createProject({
  name,
  description,
  ownerId,
}: {
  name: string;
  description?: string;
  ownerId: string;
}) {
  try {
    const now = new Date();
    const result = await db
      .insert(project)
      .values({
        name,
        description: description || null,
        ownerId,
        workspaceContainerId: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const newProject = result[0];

    // Add owner to membership
    await db.insert(membership).values({
      projectId: newProject.id,
      userId: ownerId,
      role: "owner",
      createdAt: now,
    });

    return newProject;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create project");
  }
}

/**
 * Update a project
 */
export async function updateProject({
  projectId,
  name,
  description,
}: {
  projectId: string;
  name?: string;
  description?: string;
}) {
  try {
    const updates: Partial<Project> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    return await db
      .update(project)
      .set(updates)
      .where(eq(project.id, projectId))
      .returning();
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update project");
  }
}

/**
 * Delete a project
 */
export async function deleteProject({ projectId }: { projectId: string }) {
  try {
    return await db.delete(project).where(eq(project.id, projectId));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to delete project");
  }
}
