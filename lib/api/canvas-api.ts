/**
 * Canvas API Client
 * 统一管理所有 Canvas 相关的 API 调用，提供类型安全和统一的错误处理
 */

// ========================================
// Types
// ========================================

// Note: We define a minimal CanvasNode type here to avoid circular dependencies
// The actual CanvasNode type is defined in app/(crossmind)/canvas/canvas-data.ts
export type CanvasNodeResponse = any; // Will be properly typed by consuming code

export interface CreateNodeData {
  projectId: string;
  title: string;
  content: string;
  type: "document" | "idea" | "task" | "inspiration";
  parentId?: string;
  zoneAffinities?: Record<string, Record<string, number>>;
  displayOrder?: number;
}

export interface UpdateNodeData {
  parentId?: string | null;
  displayOrder?: number;
  zoneAffinities?: Record<string, Record<string, number>>;
  hiddenInFrameworks?: Record<string, boolean>;
  [key: string]: any; // Allow other node properties
}

export interface NodePosition {
  nodeId: string;
  x: number;
  y: number;
}

export interface SuggestionGenerateParams {
  projectId: string;
  frameworkId: string;
}

export interface SuggestionApplyResult {
  type: string;
  result?: {
    changes?: {
      nodeId: string;
      prefilledPrompt: string;
    };
    affectedNodeId?: string;
  };
}

// ========================================
// Base Fetch Wrapper
// ========================================

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.error || `API request failed: ${response.statusText}`,
      response.status,
      errorData
    );
  }

  // For DELETE requests that return 204, return null
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// ========================================
// Canvas API Client
// ========================================

export const canvasApi = {
  /**
   * 节点操作
   */
  nodes: {
    /**
     * 创建节点
     */
    async create(data: CreateNodeData): Promise<CanvasNodeResponse> {
      return apiFetch("/api/canvas", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    /**
     * 更新节点
     */
    async update(nodeId: string, updates: UpdateNodeData): Promise<CanvasNodeResponse> {
      return apiFetch(`/api/canvas/${nodeId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },

    /**
     * 删除节点
     */
    async delete(nodeId: string): Promise<void> {
      return apiFetch(`/api/canvas/${nodeId}`, {
        method: "DELETE",
      });
    },

    /**
     * 隐藏节点（在当前 framework 中）
     */
    async hide(nodeId: string, frameworkId: string): Promise<void> {
      const hiddenInFrameworks = { [frameworkId]: true };
      return apiFetch(`/api/canvas/${nodeId}`, {
        method: "PATCH",
        body: JSON.stringify({ hiddenInFrameworks }),
      });
    },

    /**
     * 恢复节点（在当前 framework 中）
     */
    async restore(nodeId: string, frameworkId: string): Promise<void> {
      const hiddenInFrameworks = { [frameworkId]: false };
      return apiFetch(`/api/canvas/${nodeId}`, {
        method: "PATCH",
        body: JSON.stringify({ hiddenInFrameworks }),
      });
    },

    /**
     * 移动节点到指定 zone
     */
    async moveToZone(
      nodeId: string,
      frameworkId: string,
      zoneKey: string
    ): Promise<void> {
      const zoneAffinities = {
        [frameworkId]: { [zoneKey]: 1.0 },
      };
      return apiFetch(`/api/canvas/${nodeId}`, {
        method: "PATCH",
        body: JSON.stringify({ zoneAffinities }),
      });
    },
  },

  /**
   * AI 建议操作
   */
  suggestions: {
    /**
     * 生成 AI 建议
     */
    async generate(
      params: SuggestionGenerateParams,
      signal?: AbortSignal
    ): Promise<void> {
      return apiFetch("/api/canvas/suggestions/generate", {
        method: "POST",
        body: JSON.stringify(params),
        signal,
      });
    },

    /**
     * 应用建议
     */
    async apply(suggestionId: string): Promise<SuggestionApplyResult> {
      return apiFetch(`/api/canvas/suggestions/${suggestionId}/apply`, {
        method: "POST",
      });
    },

    /**
     * 忽略建议
     */
    async dismiss(suggestionId: string): Promise<void> {
      return apiFetch(`/api/canvas/suggestions/${suggestionId}/dismiss`, {
        method: "POST",
      });
    },
  },

  /**
   * 节点位置操作
   */
  positions: {
    /**
     * 批量保存节点位置
     */
    async save(
      projectId: string,
      frameworkId: string,
      positions: NodePosition[]
    ): Promise<void> {
      return apiFetch("/api/canvas/positions", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          frameworkId,
          positions,
        }),
      });
    },
  },

  /**
   * Zone 亲和度操作
   */
  affinities: {
    /**
     * 更新节点的 zone 亲和度
     */
    async update(
      nodeId: string,
      frameworkId: string,
      zoneKey: string,
      value: number
    ): Promise<void> {
      const zoneAffinities = {
        [frameworkId]: { [zoneKey]: value },
      };
      return apiFetch(`/api/canvas/${nodeId}`, {
        method: "PATCH",
        body: JSON.stringify({ zoneAffinities }),
      });
    },
  },
};

// Export ApiError for error handling
export { ApiError };
