import "server-only";

import { and, asc, count, desc, eq, gt, gte, inArray, isNull, lt, or, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/artifact";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSDKError } from "../errors";
import type { AppUsage } from "../usage";
import { generateUUID } from "../utils";
import type { ZoneAffinities } from "../types";
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
  canvasNodeZoneAffinity,
  type CanvasNodeZoneAffinity,
  canvasNodePosition,
  type CanvasNodePosition,
  canvasSuggestion,
  project,
  type Project,
  membership,
  type Membership,
  framework,
  type Framework,
  frameworkZone,
  type FrameworkZone,
  chatSession,
  type ChatSession,
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
  } catch (error) {
    console.error("[saveMessages] Database error details:", error);
    console.error("[saveMessages] Attempted to save messages:", JSON.stringify(messages, null, 2));
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
        hiddenInFrameworks: canvasNode.hiddenInFrameworks,  // Framework-specific visibility
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
  displayOrder,
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
  zoneAffinities?: ZoneAffinities;
  displayOrder?: number;
  taskStatus?: "todo" | "in-progress" | "done";
  assigneeId?: string;
  dueDate?: Date;
  source?: string;
  capturedAt?: Date;
  createdById: string;
}) {
  try {
    // Validate: prevent self-reference (will be enforced by DB constraint, but check early for better error message)
    if (parentId) {
      // Note: We can't check against the new node's ID yet since it doesn't exist
      // The database CHECK constraint will catch this case
      // This validation is mainly for clarity and early error detection in update scenarios
    }

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
        displayOrder: displayOrder ?? 0,
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

    // If zoneAffinities provided, also write to CanvasNodeZoneAffinity table
    if (zoneAffinities && Object.keys(zoneAffinities).length > 0) {
      for (const [frameworkId, zones] of Object.entries(zoneAffinities)) {
        for (const [zoneKey, weight] of Object.entries(zones)) {
          // Find the zone ID by zoneKey
          const [zone] = await db
            .select({ id: frameworkZone.id })
            .from(frameworkZone)
            .where(
              and(
                eq(frameworkZone.frameworkId, frameworkId),
                eq(frameworkZone.zoneKey, zoneKey)
              )
            )
            .limit(1);

          if (zone) {
            await db.insert(canvasNodeZoneAffinity).values({
              nodeId: newNode.id,
              frameworkId,
              zoneId: zone.id,
              affinityWeight: weight,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      }
    }

    return newNode;
  } catch (error: any) {
    // Check if error is due to self-reference constraint violation
    if (error?.code === "23514" || error?.message?.includes("no_self_reference")) {
      throw new ChatSDKError(
        "bad_request:database",
        "A node cannot reference itself as its parent. parentId must be different from the node's id or null.",
      );
    }
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
  hiddenInFrameworks,
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
  zoneAffinities?: ZoneAffinities;
  hiddenInFrameworks?: Record<string, boolean>;
  taskStatus?: "todo" | "in-progress" | "done";
  assigneeId?: string;
  dueDate?: Date;
  healthScore?: string;
  healthLevel?: "critical" | "warning" | "good" | "excellent";
  healthData?: any;
}) {
  try {
    // Validate: prevent self-reference
    if (parentId !== undefined && parentId !== null && parentId === id) {
      throw new ChatSDKError(
        "bad_request:database",
        "A node cannot reference itself as its parent. parentId must be different from the node's id or null.",
      );
    }

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
        ...(hiddenInFrameworks !== undefined && { hiddenInFrameworks }),
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
  } catch (error: any) {
    // Check if error is due to self-reference constraint violation
    if (error?.code === "23514" || error?.message?.includes("no_self_reference")) {
      throw new ChatSDKError(
        "bad_request:database",
        "A node cannot reference itself as its parent. parentId must be different from the node's id or null.",
      );
    }
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

// ========== Canvas Suggestions ==========

export async function getCanvasSuggestionsByFramework({
  projectId,
  frameworkId,
  status,
}: {
  projectId: string;
  frameworkId: string;
  status?: "pending" | "accepted" | "dismissed";
}) {
  try {
    const conditions = [
      eq(canvasSuggestion.projectId, projectId),
      eq(canvasSuggestion.frameworkId, frameworkId),
    ];

    if (status) {
      conditions.push(eq(canvasSuggestion.status, status));
    }

    return await db
      .select()
      .from(canvasSuggestion)
      .where(and(...conditions))
      .orderBy(
        desc(canvasSuggestion.priority),
        desc(canvasSuggestion.impactScore),
        desc(canvasSuggestion.createdAt),
      );
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get canvas suggestions");
  }
}

export async function getCanvasSuggestionsByNode({
  nodeId,
  status,
}: {
  nodeId: string;
  status?: "pending" | "accepted" | "dismissed";
}) {
  try {
    const conditions = [eq(canvasSuggestion.nodeId, nodeId)];

    if (status) {
      conditions.push(eq(canvasSuggestion.status, status));
    }

    return await db
      .select()
      .from(canvasSuggestion)
      .where(and(...conditions))
      .orderBy(
        desc(canvasSuggestion.priority),
        desc(canvasSuggestion.impactScore),
        desc(canvasSuggestion.createdAt),
      );
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get node suggestions");
  }
}

export async function getCanvasSuggestionById({ id }: { id: string }) {
  try {
    const [suggestion] = await db
      .select()
      .from(canvasSuggestion)
      .where(eq(canvasSuggestion.id, id));
    return suggestion;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get suggestion");
  }
}

export async function createCanvasSuggestion({
  projectId,
  frameworkId,
  nodeId,
  type,
  title,
  description,
  reason,
  priority,
  impactScore,
  actionParams,
  source,
}: {
  projectId: string;
  frameworkId?: string;
  nodeId?: string;
  type: "add-node" | "add-tag" | "refine-content" | "content-suggestion" | "health-issue";
  title: string;
  description: string;
  reason?: string;
  priority?: "low" | "medium" | "high" | "critical";
  impactScore?: number;
  actionParams?: any;
  source?: "ai-health-check" | "manual";
}) {
  try {
    const [newSuggestion] = await db
      .insert(canvasSuggestion)
      .values({
        projectId,
        frameworkId,
        nodeId,
        type,
        title,
        description,
        reason,
        priority: priority || "medium",
        impactScore,
        actionParams,
        source: source || "ai-health-check",
        status: "pending",
        createdAt: new Date(),
      })
      .returning();

    return newSuggestion;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create suggestion");
  }
}

export async function updateCanvasSuggestion({
  id,
  status,
  appliedAt,
  appliedById,
  dismissedAt,
  dismissedById,
}: {
  id: string;
  status?: "pending" | "accepted" | "dismissed";
  appliedAt?: Date;
  appliedById?: string;
  dismissedAt?: Date;
  dismissedById?: string;
}) {
  try {
    const updateData: any = {};

    if (status) updateData.status = status;
    if (appliedAt) updateData.appliedAt = appliedAt;
    if (appliedById) updateData.appliedById = appliedById;
    if (dismissedAt) updateData.dismissedAt = dismissedAt;
    if (dismissedById) updateData.dismissedById = dismissedById;

    const [updated] = await db
      .update(canvasSuggestion)
      .set(updateData)
      .where(eq(canvasSuggestion.id, id))
      .returning();

    return updated;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to update suggestion");
  }
}

export async function deleteCanvasSuggestion({ id }: { id: string }) {
  try {
    const [deleted] = await db
      .delete(canvasSuggestion)
      .where(eq(canvasSuggestion.id, id))
      .returning();
    return deleted;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to delete suggestion");
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
    console.log("[getProjectsByUserId] Querying for userId:", userId);

    // Get projects where user is a member (via membership table)
    const memberProjects = await db
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
      .where(eq(membership.userId, userId));

    console.log("[getProjectsByUserId] Member projects found:", memberProjects.length);

    // Get projects owned by user (even if no membership record exists)
    const ownedProjectsRaw = await db
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
      .leftJoin(membership, and(
        eq(membership.projectId, project.id),
        eq(membership.userId, userId)
      ))
      .where(eq(project.ownerId, userId));

    console.log("[getProjectsByUserId] Owned projects found:", ownedProjectsRaw.length);

    // Combine and deduplicate by project ID
    const projectMap = new Map<string, typeof memberProjects[0]>();

    // Add member projects first (these have guaranteed role from membership)
    for (const proj of memberProjects) {
      projectMap.set(proj.id, proj);
    }

    // Add owned projects (will overwrite if already exists, which is fine)
    // For projects without membership, default role to "owner"
    for (const proj of ownedProjectsRaw) {
      const projectWithRole: typeof memberProjects[0] = {
        ...proj,
        role: (proj.role ?? "owner") as "owner" | "member" | "guest",
      };
      projectMap.set(proj.id, projectWithRole);
    }

    // Convert to array and sort by updatedAt
    const result = Array.from(projectMap.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
    console.log("[getProjectsByUserId] Final result:", result.length, "projects");
    return result;
  } catch (_error) {
    console.error("[getProjectsByUserId] Error:", _error);
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

// ========== Framework Queries ==========

/**
 * Get all frameworks accessible to a user (platform + user-owned)
 * If userId is empty/undefined, returns only platform frameworks
 */
export async function getFrameworksForUser(userId?: string): Promise<Framework[]> {
  try {
    const conditions = [eq(framework.isActive, true)];

    if (userId) {
      // User-specific: platform frameworks OR user-owned frameworks
      conditions.push(or(isNull(framework.ownerId), eq(framework.ownerId, userId))!);
    } else {
      // No user: only platform frameworks
      conditions.push(isNull(framework.ownerId));
    }

    return await db
      .select()
      .from(framework)
      .where(and(...conditions))
      .orderBy(asc(framework.ownerId), asc(framework.name)); // Platform frameworks (NULL) first
  } catch (error) {
    console.error("[getFrameworksForUser] Database error:", error);
    throw new ChatSDKError("bad_request:database", "Failed to get frameworks");
  }
}

/**
 * Get a single framework with its zones
 */
export async function getFrameworkWithZones(frameworkId: string) {
  try {
    const fw = await db
      .select()
      .from(framework)
      .where(eq(framework.id, frameworkId))
      .limit(1);

    if (!fw[0]) return null;

    const zones = await db
      .select()
      .from(frameworkZone)
      .where(eq(frameworkZone.frameworkId, frameworkId))
      .orderBy(asc(frameworkZone.displayOrder));

    return { ...fw[0], zones };
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get framework with zones");
  }
}

/**
 * Create a custom framework with zones
 */
export async function createFramework(data: {
  name: string;
  icon: string;
  description: string;
  ownerId: string;
  zones: Array<{
    zoneKey: string;
    name: string;
    description?: string;
    colorKey: string;
    displayOrder: number;
  }>;
}) {
  try {
    return await db.transaction(async (tx) => {
      const [newFramework] = await tx
        .insert(framework)
        .values({
          name: data.name,
          icon: data.icon,
          description: data.description,
          ownerId: data.ownerId,
          visibility: "private",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const newZones = await tx
        .insert(frameworkZone)
        .values(
          data.zones.map((z) => ({
            frameworkId: newFramework.id,
            zoneKey: z.zoneKey,
            name: z.name,
            description: z.description,
            colorKey: z.colorKey,
            displayOrder: z.displayOrder,
            createdAt: new Date(),
          }))
        )
        .returning();

      return { framework: newFramework, zones: newZones };
    });
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create framework");
  }
}

/**
 * Get node affinities for a specific project-framework combination
 */
export async function getNodeAffinitiesForFramework(projectId: string, frameworkId: string) {
  try {
    const results = await db
      .select({
        nodeId: canvasNodeZoneAffinity.nodeId,
        zoneKey: frameworkZone.zoneKey,
        weight: canvasNodeZoneAffinity.affinityWeight,
      })
      .from(canvasNodeZoneAffinity)
      .innerJoin(canvasNode, eq(canvasNode.id, canvasNodeZoneAffinity.nodeId))
      .innerJoin(frameworkZone, eq(frameworkZone.id, canvasNodeZoneAffinity.zoneId))
      .where(
        and(
          eq(canvasNode.projectId, projectId),
          eq(canvasNodeZoneAffinity.frameworkId, frameworkId)
        )
      );

    // Transform to { nodeId: { zoneKey: weight } }
    const affinities: Record<string, Record<string, number>> = {};

    for (const row of results) {
      if (!affinities[row.nodeId]) affinities[row.nodeId] = {};
      affinities[row.nodeId][row.zoneKey] = row.weight;
    }

    return affinities;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get node affinities");
  }
}

/**
 * Update node affinities for a specific framework
 * @param affinities - Keyed by zoneKey (e.g., { "ideation": 1.0, "design": 0.5 })
 */
export async function updateNodeAffinities(
  nodeId: string,
  frameworkId: string,
  affinities: Record<string, number> // { zoneKey: weight }
) {
  try {
    return await db.transaction(async (tx) => {
      // Delete existing affinities for this node-framework pair
      await tx
        .delete(canvasNodeZoneAffinity)
        .where(
          and(
            eq(canvasNodeZoneAffinity.nodeId, nodeId),
            eq(canvasNodeZoneAffinity.frameworkId, frameworkId)
          )
        );

      // Insert new affinities
      if (Object.keys(affinities).length > 0) {
        // First, get zone IDs for the given zoneKeys
        const zones = await tx
          .select({ zoneKey: frameworkZone.zoneKey, zoneId: frameworkZone.id })
          .from(frameworkZone)
          .where(eq(frameworkZone.frameworkId, frameworkId));

        // Build map: zoneKey → zoneId
        const zoneKeyToId = new Map(zones.map(z => [z.zoneKey, z.zoneId]));

        // Convert zoneKeys to zoneIds and insert
        const values = Object.entries(affinities)
          .map(([zoneKey, weight]) => {
            const zoneId = zoneKeyToId.get(zoneKey);
            if (!zoneId) return null; // Skip invalid zoneKeys
            return {
              nodeId,
              frameworkId,
              zoneId,
              affinityWeight: weight,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          })
          .filter((v): v is NonNullable<typeof v> => v !== null); // Remove nulls

        if (values.length > 0) {
          await tx.insert(canvasNodeZoneAffinity).values(values);
        }
      }
    });
  } catch (error) {
    console.error("[updateNodeAffinities] Database error:", error);
    throw new ChatSDKError("bad_request:database", "Failed to update node affinities");
  }
}

/**
 * Get node positions for a specific framework
 * @returns Map of nodeId → { x, y }
 */
export async function getNodePositions(
  frameworkId: string,
  nodeIds: string[]
): Promise<Record<string, { x: number; y: number }>> {
  try {
    if (nodeIds.length === 0) return {};

    const positions = await db
      .select({
        nodeId: canvasNodePosition.nodeId,
        x: canvasNodePosition.x,
        y: canvasNodePosition.y,
      })
      .from(canvasNodePosition)
      .where(
        and(
          eq(canvasNodePosition.frameworkId, frameworkId),
          inArray(canvasNodePosition.nodeId, nodeIds)
        )
      );

    const result: Record<string, { x: number; y: number }> = {};
    for (const pos of positions) {
      result[pos.nodeId] = { x: pos.x, y: pos.y };
    }

    return result;
  } catch (error) {
    console.error("[getNodePositions] Database error:", error);
    return {};
  }
}

/**
 * Batch update node positions for a specific framework
 * @param positions - Array of { nodeId, x, y }
 */
export async function batchUpdateNodePositions(
  frameworkId: string,
  positions: Array<{ nodeId: string; x: number; y: number }>
) {
  try {
    if (positions.length === 0) return;

    await db.transaction(async (tx) => {
      // Use upsert pattern: delete + insert
      const nodeIds = positions.map(p => p.nodeId);

      await tx
        .delete(canvasNodePosition)
        .where(
          and(
            eq(canvasNodePosition.frameworkId, frameworkId),
            inArray(canvasNodePosition.nodeId, nodeIds)
          )
        );

      await tx.insert(canvasNodePosition).values(
        positions.map(p => ({
          nodeId: p.nodeId,
          frameworkId,
          x: p.x,
          y: p.y,
          updatedAt: new Date(),
        }))
      );
    });
  } catch (error) {
    console.error("[batchUpdateNodePositions] Database error:", error);
    throw new ChatSDKError("bad_request:database", "Failed to update node positions");
  }
}

/**
 * Get project's default framework with zones
 */
export async function getProjectFramework(projectId: string) {
  try {
    const result = await db
      .select({
        framework: framework,
        zones: frameworkZone,
      })
      .from(project)
      .leftJoin(framework, eq(framework.id, project.defaultFrameworkId))
      .leftJoin(frameworkZone, eq(frameworkZone.frameworkId, framework.id))
      .where(eq(project.id, projectId));

    if (!result[0]?.framework) return null;

    const fw = result[0].framework;
    const zones = result.map((r) => r.zones).filter((z) => z !== null) as FrameworkZone[];

    return { ...fw, zones };
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get project framework");
  }
}

/**
 * Set project's default framework
 */
export async function setProjectFramework(projectId: string, frameworkId: string) {
  try {
    await db.update(project).set({ defaultFrameworkId: frameworkId }).where(eq(project.id, projectId));
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to set project framework");
  }
}

// ========== ChatSession Queries ==========

/**
 * Get chat session by canvas node ID
 */
export async function getChatSessionByNodeId({ nodeId }: { nodeId: string }): Promise<ChatSession | null> {
  try {
    const [session] = await db.select().from(chatSession).where(eq(chatSession.canvasNodeId, nodeId)).limit(1);
    return session || null;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to get chat session");
  }
}

/**
 * Create new chat session for canvas node
 */
export async function createChatSession({
  projectId,
  canvasNodeId,
  userId,
}: {
  projectId: string;
  canvasNodeId: string;
  userId: string;
}): Promise<ChatSession> {
  try {
    const sessionId = generateUUID();
    const now = new Date();

    // Create both ChatSession and corresponding Chat record
    // Messages will reference the Chat record via chatId
    await db.transaction(async (tx) => {
      // Create Chat record with same ID as ChatSession
      await tx.insert(chat).values({
        id: sessionId,
        userId,
        title: "Canvas Chat", // Default title
        visibility: "private",
        createdAt: now,
      });

      // Create ChatSession record
      await tx.insert(chatSession).values({
        id: sessionId,
        projectId,
        canvasNodeId,
        userId,
        createdAt: now,
      });
    });

    // Return the created session
    const [newSession] = await db
      .select()
      .from(chatSession)
      .where(eq(chatSession.id, sessionId));

    return newSession;
  } catch (_error) {
    throw new ChatSDKError("bad_request:database", "Failed to create chat session");
  }
}

/**
 * Get messages by chat session ID
 * Reuses the same message table structure as regular chats
 */
export async function getMessagesByChatSessionId({ id }: { id: string }): Promise<Array<DBMessage>> {
  // ChatSession and Chat both use the same Message_v2 table with chatId foreign key
  // So we can reuse the existing getMessagesByChatId function
  return getMessagesByChatId({ id });
}
