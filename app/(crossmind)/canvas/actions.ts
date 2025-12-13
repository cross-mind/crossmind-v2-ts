"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import type { ZoneAffinities } from "@/lib/types";
import {
  createCanvasComment,
  createCanvasNode,
  updateCanvasNode,
} from "@/lib/db/queries";

export async function createNodeAction(data: {
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
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ChatSDKError("unauthorized:api");
  }

  // TODO: Check if user has access to this project
  // const hasAccess = await checkProjectAccess(session.user.id, data.projectId);
  // if (!hasAccess) throw new ChatSDKError("forbidden:api");

  const newNode = await createCanvasNode({
    ...data,
    createdById: session.user.id,
  });

  revalidatePath("/canvas");
  return newNode;
}

export async function updateNodeAction(data: {
  id: string;
  title?: string;
  content?: string;
  positions?: Record<string, { x: number; y: number }>;
  tags?: string[];
  taskStatus?: "todo" | "in-progress" | "done";
  assigneeId?: string;
  dueDate?: Date;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ChatSDKError("unauthorized:api");
  }

  // TODO: Verify user has access to this node's project

  const updated = await updateCanvasNode(data);

  revalidatePath("/canvas");
  return updated;
}

export async function addCommentAction(data: {
  nodeId: string;
  projectId: string;
  content: string;
  mentions?: string[];
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ChatSDKError("unauthorized:api");
  }

  // TODO: Verify user has access to this project

  const comment = await createCanvasComment({
    ...data,
    authorId: session.user.id,
  });

  revalidatePath("/canvas");
  return comment;
}
